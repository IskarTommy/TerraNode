import hashlib
import json

def generate_telemetry_hash(farmer_id, recorded_at, temperature, soil_moisture, soil_ph):
    """
    Generate a deterministic SHA-256 hash from telemetry data.
    """
    canonical_data = json.dumps({
        "farmer_id": str(farmer_id),
        "recorded_at": recorded_at.isoformat(),
        "temperature_celsius": f"{temperature:.2f}",
        "soil_moisture_percentage": f"{soil_moisture:.2f}",
        "soil_ph": f"{soil_ph:.2f}",
    }, sort_keys=True, separators=(",", ":"))

    return hashlib.sha256(canonical_data.encode("utf-8")).hexdigest()
