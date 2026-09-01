import logging

from django.core.cache import cache

from apps.telemetry.encryption_service import read_telemetry_values
from apps.telemetry.models import EnvironmentalTelemetry


logger = logging.getLogger(__name__)
CACHE_TTL = 600
MIN_REQUIRED_OBSERVATIONS = 5

CROP_PROFILES = {
    "MAIZE": {"optimal_temp": 24.0, "optimal_moisture": 60.0, "optimal_ph": 6.5, "base_yield": 65.0, "moisture_coeff": 0.55, "temp_penalty": 2.2},
    "RICE": {"optimal_temp": 26.0, "optimal_moisture": 75.0, "optimal_ph": 6.0, "base_yield": 70.0, "moisture_coeff": 0.60, "temp_penalty": 2.0},
    "SOYBEAN": {"optimal_temp": 23.0, "optimal_moisture": 55.0, "optimal_ph": 6.5, "base_yield": 55.0, "moisture_coeff": 0.50, "temp_penalty": 1.8},
    "TOMATO": {"optimal_temp": 22.0, "optimal_moisture": 65.0, "optimal_ph": 6.2, "base_yield": 80.0, "moisture_coeff": 0.70, "temp_penalty": 2.5},
    "CASSAVA": {"optimal_temp": 27.0, "optimal_moisture": 45.0, "optimal_ph": 5.8, "base_yield": 90.0, "moisture_coeff": 0.40, "temp_penalty": 1.5},
    "DEFAULT": {"optimal_temp": 22.0, "optimal_moisture": 60.0, "optimal_ph": 6.5, "base_yield": 50.0, "moisture_coeff": 0.50, "temp_penalty": 2.0},
}


def prediction_cache_key(farmer_id, crop_key):
    return f"analytics:predict:{farmer_id}:{crop_key}"


def invalidate_prediction_cache(farmer_id):
    for crop_key in CROP_PROFILES:
        try:
            cache.delete(prediction_cache_key(farmer_id, crop_key))
        except Exception:
            logger.warning("Redis cache invalidation failed for farmer %s", farmer_id, exc_info=True)


def _weighted_average(values):
    count = len(values)
    return sum(value * (count - index) for index, value in enumerate(values)) / sum(
        range(1, count + 1)
    )


def _safe_cache_get(key):
    try:
        return cache.get(key)
    except Exception:
        logger.warning("Prediction cache unavailable; computing directly", exc_info=True)
        return None


def _safe_cache_set(key, value):
    try:
        cache.set(key, value, CACHE_TTL)
    except Exception:
        logger.warning("Prediction cache unavailable; result was not cached", exc_info=True)


def predict_yield(farmer_id, crop_type=None):
    """Produce a transparent rule-based WMA estimate from genuine observations."""
    crop_key = (crop_type or "DEFAULT").upper()
    profile = CROP_PROFILES.get(crop_key, CROP_PROFILES["DEFAULT"])

    cache_key = prediction_cache_key(farmer_id, crop_key)
    cached = _safe_cache_get(cache_key)
    if cached is not None:
        return cached

    temperatures = []
    moistures = []
    ph_values = []
    integrity_failures = 0
    records = EnvironmentalTelemetry.objects.filter(farmer_id=farmer_id).order_by(
        "-recorded_at"
    )[:90]
    for record in records:
        try:
            values = read_telemetry_values(
                record,
                enforce_authorization=False,
                system_purpose="yield_estimation",
            )
        except Exception:
            integrity_failures += 1
            continue
        if values["temperature_celsius"] is not None:
            temperatures.append(values["temperature_celsius"])
        if values["soil_moisture_percentage"] is not None:
            moistures.append(values["soil_moisture_percentage"])
        if values["soil_ph"] is not None:
            ph_values.append(values["soil_ph"])

    counts = {
        "temperature": len(temperatures),
        "soil_moisture": len(moistures),
        "soil_ph": len(ph_values),
    }
    if (
        counts["temperature"] < MIN_REQUIRED_OBSERVATIONS
        or counts["soil_moisture"] < MIN_REQUIRED_OBSERVATIONS
    ):
        return {
            "error": (
                "Insufficient genuine data: at least 5 temperature and 5 soil-moisture "
                "observations are required; missing values are not substituted."
            ),
            "model_type": "WMA Yield Estimate (Rule-Based Forecast)",
            "data_points_analyzed": counts,
            "integrity_failures_excluded": integrity_failures,
            "required_observations": {
                "temperature": MIN_REQUIRED_OBSERVATIONS,
                "soil_moisture": MIN_REQUIRED_OBSERVATIONS,
            },
        }

    result = _estimate(
        crop_key,
        profile,
        _weighted_average(temperatures),
        _weighted_average(moistures),
        _weighted_average(ph_values) if ph_values else None,
        counts=counts,
    )
    result["integrity_failures_excluded"] = integrity_failures
    _safe_cache_set(cache_key, result)
    return result


def _estimate(crop_key, profile, temperature, moisture, ph, counts):
    predicted = (
        profile["base_yield"]
        + moisture * profile["moisture_coeff"]
        - abs(profile["optimal_temp"] - temperature) * profile["temp_penalty"]
    )
    if ph is not None:
        if ph < 5.5:
            predicted -= (5.5 - ph) * 5
        elif ph > 7.5:
            predicted -= (ph - 7.5) * 5
    confidence_basis = min(counts["temperature"], counts["soil_moisture"])
    return {
        "is_simulation": False,
        "crop_type": crop_key,
        "model_type": "WMA Yield Estimate (Rule-Based Forecast)",
        "confidence_score": round(min(0.95, confidence_basis / 90), 3),
        "predicted_yield_metric_tons": max(0.0, round(predicted, 2)),
        "data_points_analyzed": counts,
        "contributing_observations": [
            f"{name} ({count} records)"
            for name, count in counts.items()
            if count
        ],
        "recommendation": generate_recommendation(temperature, moisture, ph, profile),
        "averages": {
            "temp": round(temperature, 2),
            "moisture": round(moisture, 2),
            "ph": round(ph, 2) if ph is not None else None,
        },
    }


def generate_recommendation(temperature, moisture, ph, profile):
    advisories = []
    if moisture < profile["optimal_moisture"] - 15:
        advisories.append("Measured soil moisture is low; assess irrigation needs.")
    elif moisture > profile["optimal_moisture"] + 20:
        advisories.append("Measured soil moisture is high; inspect field drainage.")
    if temperature > profile["optimal_temp"] + 6:
        advisories.append("Measured temperature indicates heat stress risk.")
    elif temperature < profile["optimal_temp"] - 6:
        advisories.append("Measured temperature is below the crop profile range.")
    if ph is not None:
        if ph < 5.8:
            advisories.append("Measured soil pH is acidic; obtain agronomic advice before amendment.")
        elif ph > 7.4:
            advisories.append("Measured soil pH is alkaline; obtain agronomic advice before amendment.")
    else:
        advisories.append("No soil pH observation contributed to this estimate.")
    return " | ".join(advisories) if advisories else "No rule-based advisory was triggered."
