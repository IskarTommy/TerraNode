import math
from django.core.cache import cache
from apps.telemetry.models import EnvironmentalTelemetry

CACHE_TTL = 600  # 10 minutes (per thesis specification)

CROP_PROFILES = {
    "MAIZE": {"optimal_temp": 24.0, "optimal_moisture": 60.0, "optimal_ph": 6.5, "base_yield": 65.0, "moisture_coeff": 0.55, "temp_penalty": 2.2},
    "RICE": {"optimal_temp": 26.0, "optimal_moisture": 75.0, "optimal_ph": 6.0, "base_yield": 70.0, "moisture_coeff": 0.60, "temp_penalty": 2.0},
    "SOYBEAN": {"optimal_temp": 23.0, "optimal_moisture": 55.0, "optimal_ph": 6.5, "base_yield": 55.0, "moisture_coeff": 0.50, "temp_penalty": 1.8},
    "TOMATO": {"optimal_temp": 22.0, "optimal_moisture": 65.0, "optimal_ph": 6.2, "base_yield": 80.0, "moisture_coeff": 0.70, "temp_penalty": 2.5},
    "CASSAVA": {"optimal_temp": 27.0, "optimal_moisture": 45.0, "optimal_ph": 5.8, "base_yield": 90.0, "moisture_coeff": 0.40, "temp_penalty": 1.5},
    "DEFAULT": {"optimal_temp": 22.0, "optimal_moisture": 60.0, "optimal_ph": 6.5, "base_yield": 50.0, "moisture_coeff": 0.50, "temp_penalty": 2.0},
}

def predict_yield(farmer_id, crop_type=None, simulated_params=None):
    """
    Predict crop yield based on historical telemetry data and crop agronomic profiles.
    Results are cached in Redis / Memory Cache with 10-minute TTL.
    """
    crop_key = (crop_type or "DEFAULT").upper()
    profile = CROP_PROFILES.get(crop_key, CROP_PROFILES["DEFAULT"])

    # If simulation parameters are supplied, calculate without cache
    if simulated_params:
        temp = float(simulated_params.get("temp", profile["optimal_temp"]))
        moist = float(simulated_params.get("moisture", profile["optimal_moisture"]))
        ph = float(simulated_params.get("ph", profile["optimal_ph"]))
        
        predicted_yield = profile["base_yield"] + (moist * profile["moisture_coeff"]) - (abs(profile["optimal_temp"] - temp) * profile["temp_penalty"])
        predicted_yield = max(0.0, round(predicted_yield, 2))

        return {
            "is_simulation": True,
            "crop_type": crop_key,
            "confidence_score": 0.90,
            "predicted_yield_metric_tons": predicted_yield,
            "historical_variance_index": 0.10,
            "data_points_analyzed": 90,
            "recommendation": generate_recommendation(temp, moist, ph, profile),
            "averages": {"temp": temp, "moisture": moist, "ph": ph}
        }

    cache_key = f"analytics:predict:{farmer_id}:{crop_key}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    # Fetch up to 90 most recent records
    records = list(EnvironmentalTelemetry.objects.filter(
        farmer_id=farmer_id
    ).order_by("-recorded_at")[:90])

    if len(records) < 5:
        return {"error": "Insufficient data points for prediction (Need at least 5)"}

    n = len(records)

    # Weighted Moving Average: linear temporal weighting where recent readings have higher weight
    total_weights = sum(i for i in range(1, n + 1))
    
    # records[0] is most recent (weight = n), records[n-1] is oldest (weight = 1)
    w_temp = sum(r.temperature_celsius * (n - idx) for idx, r in enumerate(records)) / total_weights
    w_moisture = sum(r.soil_moisture_percentage * (n - idx) for idx, r in enumerate(records)) / total_weights
    w_ph = sum(r.soil_ph * (n - idx) for idx, r in enumerate(records)) / total_weights

    # Standard deviations for variance index
    variance_temp = sum((r.temperature_celsius - w_temp) ** 2 for r in records) / n
    variance_moist = sum((r.soil_moisture_percentage - w_moisture) ** 2 for r in records) / n
    variance_index = round(min(1.0, math.sqrt((variance_temp + variance_moist) / 2.0) / 10.0), 3)

    # Predicted Yield Formula (Thesis formulation + Crop profile coefficients)
    predicted_yield = profile["base_yield"] + (w_moisture * profile["moisture_coeff"]) - (abs(profile["optimal_temp"] - w_temp) * profile["temp_penalty"])
    
    # pH penalty if outside 5.5 - 7.5
    if w_ph < 5.5:
        predicted_yield -= (5.5 - w_ph) * 5.0
    elif w_ph > 7.5:
        predicted_yield -= (w_ph - 7.5) * 5.0

    predicted_yield = max(0.0, round(predicted_yield, 2))

    # Confidence score based on sample size (0.95 max at 90 data points)
    confidence = round(min(0.95, n / 90.0), 3)

    recommendation = generate_recommendation(w_temp, w_moisture, w_ph, profile)

    result = {
        "is_simulation": False,
        "crop_type": crop_key,
        "confidence_score": confidence,
        "predicted_yield_metric_tons": predicted_yield,
        "historical_variance_index": variance_index,
        "data_points_analyzed": n,
        "recommendation": recommendation,
        "averages": {
            "temp": round(w_temp, 2),
            "moisture": round(w_moisture, 2),
            "ph": round(w_ph, 2)
        }
    }

    cache.set(cache_key, result, CACHE_TTL)
    return result

def generate_recommendation(temp, moisture, ph, profile):
    advisories = []
    
    if moisture < (profile["optimal_moisture"] - 15.0):
        advisories.append("Critical soil moisture deficit detected; initiate drip irrigation.")
    elif moisture > (profile["optimal_moisture"] + 20.0):
        advisories.append("Soil moisture exceeds saturation point; verify field drainage channels.")

    if temp > (profile["optimal_temp"] + 6.0):
        advisories.append("High ambient thermal stress; consider shade nets or evening watering.")
    elif temp < (profile["optimal_temp"] - 6.0):
        advisories.append("Sub-optimal cold temperature observed; monitor vegetative growth.")

    if ph < 5.8:
        advisories.append("Soil is overly acidic; consider agricultural lime application.")
    elif ph > 7.4:
        advisories.append("Soil is mildly alkaline; consider elemental sulfur or organic compost.")

    if not advisories:
        return "Optimal agronomic conditions maintained. Yield trajectory on track."
    
    return " | ".join(advisories)
