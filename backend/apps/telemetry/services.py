import hashlib
import json

def generate_telemetry_hash(farmer_id, recorded_at, temperature, soil_moisture, soil_ph):
    """
    Generate a deterministic SHA-256 hash from telemetry data, supporting partial real observations.
    """
    canonical_data = json.dumps({
        "farmer_id": str(farmer_id),
        "recorded_at": recorded_at.isoformat(),
        "temperature_celsius": f"{temperature:.2f}" if temperature is not None else None,
        "soil_moisture_percentage": f"{soil_moisture:.2f}" if soil_moisture is not None else None,
        "soil_ph": f"{soil_ph:.2f}" if soil_ph is not None else None,
    }, sort_keys=True, separators=(",", ":"))

    return hashlib.sha256(canonical_data.encode("utf-8")).hexdigest()
