from django.core.cache import cache
from apps.telemetry.models import EnvironmentalTelemetry

CACHE_TTL = 600  # 10 minutes

def predict_yield(farmer_id):
    """
    Predict crop yield based on historical telemetry data.
    Results are cached in Redis for 10 minutes.
    """
    cache_key = f"analytics:predict:{farmer_id}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    # Fetch last 30 days of telemetry
    records = EnvironmentalTelemetry.objects.filter(
        farmer_id=farmer_id
    ).order_by("-recorded_at")[:90]

    if len(records) < 5:
        return {"error": "Insufficient data points for prediction (Need at least 5)"}

    # Simplified mock logic for weighted moving average based on specs
    # In a real app this would contain statistical weighting or an ML model call
    avg_temp = sum(r.temperature_celsius for r in records) / len(records)
    avg_moisture = sum(r.soil_moisture_percentage for r in records) / len(records)
    avg_ph = sum(r.soil_ph for r in records) / len(records)

    predicted_yield = 50.0 + (avg_moisture * 0.5) - abs(22.0 - avg_temp) * 2.0
    predicted_yield = max(0.0, predicted_yield) # Floor at 0
    
    confidence = min(0.95, len(records) / 90.0)

    recommendation = "Maintain current conditions."
    if avg_moisture < 40:
        recommendation = "Increase irrigation to prevent crop stress."
    elif avg_temp > 35:
        recommendation = "Temperature is too high, consider shading."

    result = {
        "confidence_score": confidence,
        "predicted_yield_metric_tons": predicted_yield,
        "historical_variance_index": 0.15,
        "data_points_analyzed": len(records),
        "recommendation": recommendation,
        "averages": {
            "temp": avg_temp,
            "moisture": avg_moisture,
            "ph": avg_ph
        }
    }

    cache.set(cache_key, result, CACHE_TTL)
    return result
