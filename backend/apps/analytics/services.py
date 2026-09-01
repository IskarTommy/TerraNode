import math
from django.core.cache import cache
from apps.telemetry.models import EnvironmentalTelemetry

CACHE_TTL = 600

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
    Computes a Weighted Moving Average (WMA) rule-based crop yield estimate.
    Handles partial observations (ignoring unavailable null values without converting them to zero).
    """
    crop_key = (crop_type or "DEFAULT").upper()
    profile = CROP_PROFILES.get(crop_key, CROP_PROFILES["DEFAULT"])

    if simulated_params:
        temp = float(simulated_params.get("temp", profile["optimal_temp"]))
        moist = float(simulated_params.get("moisture", profile["optimal_moisture"]))
        ph = float(simulated_params.get("ph", profile["optimal_ph"]))

        predicted_yield = profile["base_yield"] + (moist * profile["moisture_coeff"]) - (abs(profile["optimal_temp"] - temp) * profile["temp_penalty"])
        predicted_yield = max(0.0, round(predicted_yield, 2))

        return {
            "is_simulation": True,
            "crop_type": crop_key,
            "model_type": "WMA Yield Estimate (Rule-Based Forecast)",
            "confidence_score": 0.90,
            "predicted_yield_metric_tons": predicted_yield,
            "historical_variance_index": 0.10,
            "data_points_analyzed": 90,
            "contributing_observations": ["simulated_temp", "simulated_moisture", "simulated_ph"],
            "recommendation": generate_recommendation(temp, moist, ph, profile),
            "averages": {"temp": temp, "moisture": moist, "ph": ph}
        }

    cache_key = f"analytics:predict:{farmer_id}:{crop_key}"
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

    temp_records = [(r, r.temperature_celsius) for r in records if r.temperature_celsius is not None]
    moist_records = [(r, r.soil_moisture_percentage) for r in records if r.soil_moisture_percentage is not None]
    ph_records = [(r, r.soil_ph) for r in records if r.soil_ph is not None]

    contributing_obs = []

    if temp_records:
        n_t = len(temp_records)
        w_t = sum(r[1] * (n_t - idx) for idx, r in enumerate(temp_records)) / sum(range(1, n_t + 1))
        contributing_obs.append(f"temperature ({n_t} records)")
    else:
        w_t = profile["optimal_temp"]

    if moist_records:
        n_m = len(moist_records)
        w_m = sum(r[1] * (n_m - idx) for idx, r in enumerate(moist_records)) / sum(range(1, n_m + 1))
        contributing_obs.append(f"soil_moisture ({n_m} records)")
    else:
        w_m = profile["optimal_moisture"]

    if ph_records:
        n_p = len(ph_records)
        w_p = sum(r[1] * (n_p - idx) for idx, r in enumerate(ph_records)) / sum(range(1, n_p + 1))
        contributing_obs.append(f"soil_ph ({n_p} records)")
    else:
        w_p = profile["optimal_ph"]

    predicted_yield = profile["base_yield"] + (w_m * profile["moisture_coeff"]) - (abs(profile["optimal_temp"] - w_t) * profile["temp_penalty"])

    if ph_records:
        if w_p < 5.5:
            predicted_yield -= (5.5 - w_p) * 5.0
        elif w_p > 7.5:
            predicted_yield -= (w_p - 7.5) * 5.0

    predicted_yield = max(0.0, round(predicted_yield, 2))

    confidence = round(min(0.95, len(records) / 90.0), 3)

    result = {
        "is_simulation": False,
        "crop_type": crop_key,
        "model_type": "WMA Yield Estimate (Rule-Based Forecast)",
        "confidence_score": confidence,
        "predicted_yield_metric_tons": predicted_yield,
        "data_points_analyzed": len(records),
        "contributing_observations": contributing_obs,
        "recommendation": generate_recommendation(w_t, w_m, w_p, profile),
        "averages": {
            "temp": round(w_t, 2) if temp_records else None,
            "moisture": round(w_m, 2) if moist_records else None,
            "ph": round(w_p, 2) if ph_records else None
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
