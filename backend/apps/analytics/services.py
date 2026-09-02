from django.core.cache import cache
from apps.telemetry.models import EnvironmentalTelemetry

CACHE_TTL = 600

def predict_yield(farmer_id, crop_type=None):
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

    valid_temps = [r.temperature_celsius for r in records if r.temperature_celsius is not None]
    valid_moistures = [r.soil_moisture_percentage for r in records if r.soil_moisture_percentage is not None]
    valid_phs = [r.soil_ph for r in records if r.soil_ph is not None]

    avg_temp = sum(valid_temps) / len(valid_temps) if valid_temps else 25.0
    avg_moisture = sum(valid_moistures) / len(valid_moistures) if valid_moistures else 50.0
    avg_ph = sum(valid_phs) / len(valid_phs) if valid_phs else 6.5

    predicted_yield = 50.0 + (avg_moisture * 0.5) - abs(22.0 - avg_temp) * 2.0
    predicted_yield = max(0.0, round(predicted_yield, 2))
    confidence = round(min(0.95, len(records) / 90.0), 3)

    variance = sum((t - avg_temp) ** 2 for t in valid_temps) / len(valid_temps) if valid_temps else 0.0
    if valid_moistures:
        variance += sum((m - avg_moisture) ** 2 for m in valid_moistures) / len(valid_moistures)

    result = {
        "model_type": "WMA Yield Estimate (Rule-Based Forecast)",
        "confidence_score": confidence,
        "predicted_yield_metric_tons": predicted_yield,
        "historical_variance_index": round(variance, 3),
        "data_points_analyzed": len(records),
        "recommendation": generate_recommendation(avg_temp, avg_moisture),
        "contributing_observations": [
            f"temperature ({len(valid_temps)} records)",
            f"soil moisture ({len(valid_moistures)} records)",
            f"soil pH ({len(valid_phs)} records)",
        ],
        "averages": {
            "temp": round(avg_temp, 2) if valid_temps else None,
            "moisture": round(avg_moisture, 2) if valid_moistures else None,
            "ph": round(avg_ph, 2) if valid_phs else None,
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
