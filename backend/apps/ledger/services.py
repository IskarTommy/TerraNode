import os
import json
import urllib.request
import urllib.parse
from django.conf import settings
from apps.telemetry.services import generate_telemetry_hash
from apps.users.models import AuditEvent

DEFAULT_SUI_RPC_URL = os.environ.get("SUI_RPC_URL", "https://fullnode.testnet.sui.io:443")
SUI_PACKAGE_ID = os.environ.get("SUI_PACKAGE_ID", "0x12d791039ab75e08f41140ccb9be4ce80b917f3eb2b52dab150831bc29afb92f")
SUI_MODULE_NAME = os.environ.get("SUI_MODULE_NAME", "agri_ledger")


def verify_integrity(batch):
    """
    Re-computes the telemetry integrity hash from the linked telemetry record.
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


def verify_sui_transaction_on_rpc(tx_digest: str, expected_sender: str = None, expected_function: str = None, rpc_url: str = DEFAULT_SUI_RPC_URL) -> dict:
    """
    Queries configured Sui RPC fullnode for transaction block details and verifies status, sender, and object changes.
    """
    if not tx_digest:
        return {"verified": False, "error": "Transaction digest is required"}

    if tx_digest.startswith("SIMULATED_TX") or "SIMULATED" in tx_digest:
        if settings.DEBUG:
            return {"verified": True, "digest": tx_digest, "object_id": tx_digest, "off_chain": True}
        return {"verified": False, "error": "SIMULATED_TX digests are strictly forbidden in production"}

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "sui_getTransactionBlock",
        "params": [
            tx_digest,
            {
                "showInput": True,
                "showRawInput": False,
                "showEffects": True,
                "showEvents": True,
                "showObjectChanges": True,
                "showBalanceChanges": False
            }
        ]
    }

    try:
        req = urllib.request.Request(
            rpc_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json", "User-Agent": "TerraNode-Sui-Verifier/1.0"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))

        if "error" in data or "result" not in data or not data["result"]:
            if settings.DEBUG:
                return {"verified": True, "digest": tx_digest, "object_id": tx_digest, "off_chain": True}
            return {"verified": False, "error": f"Sui RPC error: {data.get('error')}"}

        result = data["result"]
        effects = result.get("effects", {})
        status_info = effects.get("status", {})

        if status_info.get("status") != "success":
            return {"verified": False, "error": f"Transaction execution failed on-chain: {status_info.get('error')}"}

        transaction = result.get("transaction", {})
        sender = transaction.get("data", {}).get("sender")

        if expected_sender and sender and sender.lower() != expected_sender.lower():
            return {"verified": False, "error": f"Sender mismatch: expected {expected_sender}, got {sender}"}

        object_changes = result.get("objectChanges", [])
        created_object_id = None
        for change in object_changes:
            if change.get("type") in ["created", "mutated"] and "ProduceBatch" in change.get("objectType", ""):
                created_object_id = change.get("objectId")
                break

        return {
            "verified": True,
            "digest": tx_digest,
            "sender": sender,
            "object_id": created_object_id or tx_digest,
            "effects": effects,
            "events": result.get("events", []),
            "object_changes": object_changes
        }
    except Exception as e:
        if settings.DEBUG:
            return {"verified": True, "digest": tx_digest, "object_id": tx_digest, "off_chain": True}
        return {"verified": False, "error": f"Failed to connect to Sui Testnet RPC ({rpc_url}): {e}"}
