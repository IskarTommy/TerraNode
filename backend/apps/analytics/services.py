from django.core.cache import cache
from apps.telemetry.models import EnvironmentalTelemetry

CACHE_TTL = 600

def predict_yield(farmer_id):
    """
    Implements the deterministic yield model specified in the thesis appendix.
    """
    cache_key = f"analytics:predict:{farmer_id}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    records = list(EnvironmentalTelemetry.objects.filter(
        farmer_id=farmer_id
    ).order_by("-recorded_at")[:90])

    if len(records) < 5:
        return {
            "error": "Insufficient data points for prediction (Need at least 5)",
            "model_type": "WMA Yield Estimate (Rule-Based Forecast)",
            "data_points_analyzed": len(records)
        }

    avg_temp = sum(record.temperature_celsius for record in records) / len(records)
    avg_moisture = sum(record.soil_moisture_percentage for record in records) / len(records)
    avg_ph = sum(record.soil_ph for record in records) / len(records)
    predicted_yield = 50.0 + (avg_moisture * 0.5) - abs(22.0 - avg_temp) * 2.0
    predicted_yield = max(0.0, round(predicted_yield, 2))
    confidence = round(min(0.95, len(records) / 90.0), 3)

    variance = sum((record.temperature_celsius - avg_temp) ** 2 for record in records) / len(records)
    variance += sum((record.soil_moisture_percentage - avg_moisture) ** 2 for record in records) / len(records)

    result = {
        "model_type": "Thesis weighted environmental yield model",
        "confidence_score": confidence,
        "predicted_yield_metric_tons": predicted_yield,
        "historical_variance_index": round(variance, 3),
        "data_points_analyzed": len(records),
        "recommendation": generate_recommendation(avg_temp, avg_moisture),
        "averages": {
            "temp": round(avg_temp, 2),
            "moisture": round(avg_moisture, 2),
            "ph": round(avg_ph, 2),
        }
    }

    cache.set(cache_key, result, CACHE_TTL)
    return result

def generate_recommendation(temp, moisture):
    if moisture < 40:
        return "Increase irrigation to prevent crop stress."
    if temp > 35:
        return "Temperature is too high; consider shading."
    return "Maintain current conditions."
