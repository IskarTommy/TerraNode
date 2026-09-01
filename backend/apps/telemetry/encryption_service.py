import base64
import hashlib
import json
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.core.exceptions import ImproperlyConfigured, PermissionDenied
from django.utils import timezone

from apps.users.models import AuditEvent
from .services import CURRENT_SCHEMA_VERSION, canonical_telemetry_payload


def get_encryption_key(key_version=1):
    variable = f"TELEMETRY_ENCRYPTION_KEY_V{key_version}"
    encoded = os.environ.get(variable)
    if not encoded and key_version == 1:
        encoded = os.environ.get("TELEMETRY_ENCRYPTION_KEY")
    if not encoded:
        raise ImproperlyConfigured(
            f"{variable} must contain a base64-encoded 32-byte AES key"
        )
    try:
        key = base64.b64decode(encoded, validate=True)
    except (ValueError, TypeError) as exc:
        raise ImproperlyConfigured(f"{variable} is not valid base64") from exc
    if len(key) != 32:
        raise ImproperlyConfigured(f"{variable} must decode to exactly 32 bytes")
    return key


def serialize_canonical_plaintext(
    farmer_id,
    recorded_at_iso,
    temperature,
    soil_moisture,
    soil_ph,
    schema_version=CURRENT_SCHEMA_VERSION,
):
    return canonical_telemetry_payload(
        farmer_id,
        recorded_at_iso,
        temperature,
        soil_moisture,
        soil_ph,
        schema_version=schema_version,
    )


def construct_associated_data(farmer_id, recorded_at_iso, schema_version=CURRENT_SCHEMA_VERSION):
    return json.dumps(
        {
            "farmer_id": str(farmer_id),
            "recorded_at": recorded_at_iso,
            "schema_version": schema_version,
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def encrypt_telemetry_payload(
    farmer_id,
    recorded_at_iso,
    temperature,
    soil_moisture,
    soil_ph,
    key_bytes=None,
    schema_version=CURRENT_SCHEMA_VERSION,
    key_version=1,
):
    key = key_bytes or get_encryption_key(key_version)
    if len(key) != 32:
        raise ValueError("AES-256-GCM requires a 32-byte key")
    canonical = serialize_canonical_plaintext(
        farmer_id,
        recorded_at_iso,
        temperature,
        soil_moisture,
        soil_ph,
        schema_version,
    )
    nonce = os.urandom(12)
    sealed = AESGCM(key).encrypt(
        nonce,
        canonical,
        construct_associated_data(farmer_id, recorded_at_iso, schema_version),
    )
    return (
        base64.b64encode(sealed[:-16]).decode("ascii"),
        base64.b64encode(nonce).decode("ascii"),
        base64.b64encode(sealed[-16:]).decode("ascii"),
        hashlib.sha256(canonical).hexdigest(),
    )


def decrypt_telemetry_payload(
    farmer_id,
    recorded_at_iso,
    ciphertext_b64,
    nonce_b64,
    auth_tag_b64,
    key_bytes=None,
    schema_version=CURRENT_SCHEMA_VERSION,
    key_version=1,
    request_user=None,
):
    key = key_bytes or get_encryption_key(key_version)
    try:
        ciphertext = base64.b64decode(ciphertext_b64, validate=True)
        nonce = base64.b64decode(nonce_b64, validate=True)
        tag = base64.b64decode(auth_tag_b64, validate=True)
        if len(nonce) != 12 or len(tag) != 16:
            raise InvalidTag
        plaintext = AESGCM(key).decrypt(
            nonce,
            ciphertext + tag,
            construct_associated_data(farmer_id, recorded_at_iso, schema_version),
        )
        data = json.loads(plaintext.decode("utf-8"))
        if (
            str(data.get("farmer_id")) != str(farmer_id)
            or data.get("recorded_at") != recorded_at_iso
            or (
                schema_version != 0
                and data.get("schema_version") != schema_version
            )
        ):
            raise InvalidTag
        return {
            "temperature_celsius": (
                float(data["temperature_celsius"])
                if data.get("temperature_celsius") is not None
                else None
            ),
            "soil_moisture_percentage": (
                float(data["soil_moisture_percentage"])
                if data.get("soil_moisture_percentage") is not None
                else None
            ),
            "soil_ph": float(data["soil_ph"]) if data.get("soil_ph") is not None else None,
        }
    except Exception as exc:
        AuditEvent.objects.create(
            event_type=AuditEvent.EventType.SECURITY_ALERT,
            user=request_user if getattr(request_user, "is_authenticated", False) else None,
            description="AES-256-GCM telemetry authentication failed",
            metadata={
                "farmer_id": str(farmer_id),
                "recorded_at": recorded_at_iso,
                "failure_type": type(exc).__name__,
                "schema_version": schema_version,
                "key_version": key_version,
            },
        )
        raise ValueError("Telemetry decryption failed closed") from exc


def read_telemetry_values(record, request_user=None, enforce_authorization=True):
    if enforce_authorization:
        allowed = (
            getattr(request_user, "is_authenticated", False)
            and (
                request_user.pk == record.farmer_id
                or request_user.role == request_user.Role.ADMIN
            )
        )
        if not allowed:
            raise PermissionDenied("Not authorized to decrypt this telemetry record")

    if record.encrypted_payload_b64:
        values = decrypt_telemetry_payload(
            farmer_id=record.farmer_id,
            recorded_at_iso=record.recorded_at.isoformat(),
            ciphertext_b64=record.encrypted_payload_b64,
            nonce_b64=record.nonce_b64,
            auth_tag_b64=record.auth_tag_b64,
            schema_version=record.schema_version,
            key_version=record.key_version,
            request_user=request_user,
        )
    else:
        values = {
            "temperature_celsius": record.temperature_celsius,
            "soil_moisture_percentage": record.soil_moisture_percentage,
            "soil_ph": record.soil_ph,
        }
    canonical = serialize_canonical_plaintext(
        record.farmer_id,
        record.recorded_at.isoformat(),
        values["temperature_celsius"],
        values["soil_moisture_percentage"],
        values["soil_ph"],
        record.schema_version,
    )
    if hashlib.sha256(canonical).hexdigest() != record.payload_sha256:
        AuditEvent.objects.create(
            event_type=AuditEvent.EventType.INTEGRITY_CHECK_FAIL,
            user=request_user if getattr(request_user, "is_authenticated", False) else None,
            description="Telemetry canonical hash verification failed",
            metadata={"telemetry_id": str(record.pk)},
        )
        raise ValueError("Telemetry integrity verification failed closed")
    return values


def encrypted_storage_fields(
    farmer_id,
    recorded_at,
    temperature,
    soil_moisture,
    soil_ph,
    schema_version=CURRENT_SCHEMA_VERSION,
    key_version=1,
):
    ciphertext, nonce, tag, payload_hash = encrypt_telemetry_payload(
        farmer_id,
        recorded_at.isoformat(),
        temperature,
        soil_moisture,
        soil_ph,
        schema_version=schema_version,
        key_version=key_version,
    )
    return {
        "encrypted_payload_b64": ciphertext,
        "nonce_b64": nonce,
        "auth_tag_b64": tag,
        "payload_sha256": payload_hash,
        "schema_version": schema_version,
        "key_version": key_version,
        "encrypted_at": timezone.now(),
    }
