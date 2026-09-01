import os
import json
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from apps.users.models import AuditEvent


def get_encryption_key() -> bytes:
    key_b64 = os.environ.get("TELEMETRY_ENCRYPTION_KEY")
    if not key_b64:
        raise ImproperlyConfigured("TELEMETRY_ENCRYPTION_KEY environment variable is required (must be base64-encoded 32-byte key).")
    try:
        key_bytes = base64.b64decode(key_b64)
        if len(key_bytes) != 32:
            raise ValueError("TELEMETRY_ENCRYPTION_KEY must be 32 bytes when decoded")
        return key_bytes
    except Exception as e:
        raise ValueError(f"Invalid TELEMETRY_ENCRYPTION_KEY base64 format: {e}")


def serialize_canonical_plaintext(farmer_id, recorded_at_iso: str, temperature, soil_moisture, soil_ph, schema_version: int = 1) -> bytes:
    """Produces one versioned canonical plaintext JSON representation."""
    canonical_dict = {
        "farmer_id": str(farmer_id),
        "recorded_at": recorded_at_iso,
        "temperature_celsius": f"{temperature:.2f}" if temperature is not None else None,
        "soil_moisture_percentage": f"{soil_moisture:.2f}" if soil_moisture is not None else None,
        "soil_ph": f"{soil_ph:.2f}" if soil_ph is not None else None,
        "schema_version": schema_version
    }
    return json.dumps(canonical_dict, sort_keys=True, separators=(",", ":")).encode("utf-8")


def construct_associated_data(farmer_id, recorded_at_iso: str, schema_version: int = 1) -> bytes:
    """Binds stable metadata as authenticated associated data (AAD)."""
    return f"farmer:{farmer_id}|recorded_at:{recorded_at_iso}|v:{schema_version}".encode("utf-8")


def encrypt_telemetry_payload(farmer_id, recorded_at_iso: str, temperature, soil_moisture, soil_ph, key_bytes: bytes = None, schema_version: int = 1):
    """
    Encrypts canonical telemetry payload with AES-256-GCM using unique 96-bit random nonce.
    Returns (ciphertext_b64, nonce_b64, auth_tag_b64, sha256_hex).
    """
    if key_bytes is None:
        key_bytes = get_encryption_key()

    canonical_bytes = serialize_canonical_plaintext(farmer_id, recorded_at_iso, temperature, soil_moisture, soil_ph, schema_version)
    sha256_hex = hashlib.sha256(canonical_bytes).hexdigest()

    nonce = os.urandom(12)
    aad = construct_associated_data(farmer_id, recorded_at_iso, schema_version)

    aesgcm = AESGCM(key_bytes)
    ct_with_tag = aesgcm.encrypt(nonce, canonical_bytes, aad)

    ciphertext = ct_with_tag[:-16]
    auth_tag = ct_with_tag[-16:]

    return (
        base64.b64encode(ciphertext).decode('utf-8'),
        base64.b64encode(nonce).decode('utf-8'),
        base64.b64encode(auth_tag).decode('utf-8'),
        sha256_hex
    )


def decrypt_telemetry_payload(farmer_id, recorded_at_iso: str, ciphertext_b64: str, nonce_b64: str, auth_tag_b64: str, key_bytes: bytes = None, schema_version: int = 1, request_user=None):
    """
    Decrypts AES-256-GCM telemetry payload. Logs security audit event on tag/AAD failure.
    Returns parsed dict: {temperature_celsius, soil_moisture_percentage, soil_ph}.
    """
    if key_bytes is None:
        key_bytes = get_encryption_key()

    try:
        ciphertext = base64.b64decode(ciphertext_b64)
        nonce = base64.b64decode(nonce_b64)
        auth_tag = base64.b64decode(auth_tag_b64)
        ct_with_tag = ciphertext + auth_tag

        aad = construct_associated_data(farmer_id, recorded_at_iso, schema_version)

        aesgcm = AESGCM(key_bytes)
        decrypted_bytes = aesgcm.decrypt(nonce, ct_with_tag, aad)

        data = json.loads(decrypted_bytes.decode('utf-8'))
        return {
            "temperature_celsius": float(data["temperature_celsius"]) if data.get("temperature_celsius") is not None else None,
            "soil_moisture_percentage": float(data["soil_moisture_percentage"]) if data.get("soil_moisture_percentage") is not None else None,
            "soil_ph": float(data["soil_ph"]) if data.get("soil_ph") is not None else None,
        }
    except Exception as e:
        AuditEvent.objects.create(
            event_type=AuditEvent.EventType.SECURITY_ALERT,
            user=request_user if (request_user and request_user.is_authenticated) else None,
            description=f"AES-256-GCM Decryption / Tag Verification Failed for farmer {farmer_id} at {recorded_at_iso}: {e}",
            metadata={"farmer_id": str(farmer_id), "recorded_at": recorded_at_iso, "error": str(e)}
        )
        raise ValueError(f"AES-256-GCM authentication failure or corrupted payload: {e}")
