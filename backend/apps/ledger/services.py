from apps.telemetry.services import generate_telemetry_hash

def verify_integrity(batch):
    """
    Re-compute the hash from the linked telemetry record.
    This hash can be compared against the on-chain data_integrity_hash.
    Returns the recomputed hash.
    """
    telemetry = batch.origin_telemetry
    if not telemetry:
        return None

    recomputed_hash = generate_telemetry_hash(
        farmer_id=telemetry.farmer_id,
        recorded_at=telemetry.recorded_at,
        temperature=telemetry.temperature_celsius,
        soil_moisture=telemetry.soil_moisture_percentage,
        soil_ph=telemetry.soil_ph,
    )

    return recomputed_hash
