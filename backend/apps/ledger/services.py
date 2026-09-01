import json
import os
import urllib.error
import urllib.request

from apps.telemetry.encryption_service import read_telemetry_values
from apps.telemetry.services import generate_telemetry_hash


DEFAULT_SUI_RPC_URL = "https://fullnode.testnet.sui.io:443"
DEFAULT_TESTNET_CHAIN_ID = "4c78adac"
DEFAULT_PACKAGE_ID = "0x12d791039ab75e08f41140ccb9be4ce80b917f3eb2b52dab150831bc29afb92f"
DEFAULT_MODULE_NAME = "agri_ledger"


class SuiRPCUnavailable(RuntimeError):
    """The configured fullnode could not provide a usable response."""


class SuiVerificationError(ValueError):
    """The transaction exists, but does not prove the expected operation."""


def _normalise_address(value):
    if not isinstance(value, str):
        return None
    value = value.strip().lower()
    if not value.startswith("0x"):
        return None
    try:
        body = value[2:]
        int(body, 16)
    except (TypeError, ValueError):
        return None
    if not body or len(body) > 64:
        return None
    return "0x" + body.rjust(64, "0")


def _configured_value(name, default):
    value = os.environ.get(name, default).strip()
    if not value or "your_" in value.lower():
        raise SuiVerificationError(f"{name} is not configured")
    return value


def _rpc_call(method, params, rpc_url=None):
    endpoint = rpc_url or os.environ.get("SUI_RPC_URL", DEFAULT_SUI_RPC_URL)
    payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "TerraNode-Sui-Verifier/2.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SuiRPCUnavailable(f"Sui RPC is unavailable: {exc}") from exc

    if data.get("error"):
        raise SuiVerificationError(f"Sui RPC rejected the request: {data['error']}")
    if "result" not in data or data["result"] is None:
        raise SuiVerificationError("Sui RPC returned no result")
    return data["result"]


def _move_calls(transaction_result):
    transaction_data = transaction_result.get("transaction", {}).get("data", {})
    programmable = transaction_data.get("transaction", {})
    commands = programmable.get("transactions") or programmable.get("commands") or []
    calls = []
    for command in commands:
        move_call = command.get("MoveCall") if isinstance(command, dict) else None
        if not isinstance(move_call, dict):
            continue
        calls.append(
            {
                "package": move_call.get("package"),
                "module": move_call.get("module"),
                "function": move_call.get("function"),
            }
        )
    return calls


def _hash_bytes(value):
    if isinstance(value, list) and all(isinstance(item, int) and 0 <= item <= 255 for item in value):
        return bytes(value)
    if isinstance(value, str):
        stripped = value[2:] if value.startswith("0x") else value
        try:
            return bytes.fromhex(stripped)
        except ValueError:
            return value.encode("utf-8")
    return None


def _event_matches(events, package_id, module_name, event_name, expected_fields):
    expected_type = f"{package_id}::{module_name}::{event_name}".lower()
    for event in events or []:
        if str(event.get("type", "")).lower() != expected_type:
            continue
        parsed = event.get("parsedJson") or event.get("parsed_json") or {}
        if all(_field_matches(parsed.get(key), expected) for key, expected in expected_fields.items()):
            return True
    return False


def _field_matches(actual, expected):
    if expected is None:
        return True
    if isinstance(expected, int):
        try:
            return int(actual) == expected
        except (TypeError, ValueError):
            return False
    if isinstance(expected, bytes):
        return _hash_bytes(actual) == expected
    if isinstance(expected, str) and expected.startswith("0x"):
        return _normalise_address(actual) == _normalise_address(expected)
    return str(actual) == str(expected)


def _object_owner_address(owner):
    if isinstance(owner, dict):
        return owner.get("AddressOwner")
    return None


def verify_integrity(batch):
    """Recompute the linked telemetry hash; return None when no telemetry is linked."""
    telemetry = batch.origin_telemetry
    if not telemetry:
        return None
    values = read_telemetry_values(telemetry, enforce_authorization=False)
    return generate_telemetry_hash(
        farmer_id=telemetry.farmer_id,
        recorded_at=telemetry.recorded_at,
        temperature=values["temperature_celsius"],
        soil_moisture=values["soil_moisture_percentage"],
        soil_ph=values["soil_ph"],
        schema_version=telemetry.schema_version,
    )


def verify_sui_transaction_on_rpc(
    tx_digest,
    expected_sender=None,
    expected_function=None,
    expected_batch=None,
    expected_object_id=None,
    expected_recipient=None,
    rpc_url=None,
):
    """
    Verify a TerraNode Move call and the final ProduceBatch object.

    A positive result requires the configured testnet, a successful transaction,
    the exact package/module/function call, the expected event, matching object
    fields, and the expected final owner. Any missing evidence fails closed.
    """
    if not tx_digest or "SIMULATED" in str(tx_digest).upper():
        return {"verified": False, "reason_code": "invalid_digest", "error": "A real Sui transaction digest is required"}

    try:
        package_id = _normalise_address(_configured_value("SUI_PACKAGE_ID", DEFAULT_PACKAGE_ID))
        module_name = _configured_value("SUI_MODULE_NAME", DEFAULT_MODULE_NAME)
        expected_chain_id = _configured_value("SUI_TESTNET_CHAIN_ID", DEFAULT_TESTNET_CHAIN_ID)
        if not package_id:
            raise SuiVerificationError("SUI_PACKAGE_ID is not a valid Sui address")

        chain_id = _rpc_call("sui_getChainIdentifier", [], rpc_url)
        if chain_id != expected_chain_id:
            raise SuiVerificationError(f"Wrong Sui network: expected {expected_chain_id}, got {chain_id}")

        result = _rpc_call(
            "sui_getTransactionBlock",
            [
                tx_digest,
                {
                    "showInput": True,
                    "showEffects": True,
                    "showEvents": True,
                    "showObjectChanges": True,
                },
            ],
            rpc_url,
        )
        status = result.get("effects", {}).get("status", {})
        if status.get("status") != "success":
            raise SuiVerificationError(f"Transaction did not succeed: {status.get('error', 'unknown failure')}")

        sender = result.get("transaction", {}).get("data", {}).get("sender")
        if not expected_sender or _normalise_address(sender) != _normalise_address(expected_sender):
            raise SuiVerificationError("Transaction sender does not match the authenticated custodian wallet")

        function_name = expected_function or "mint_batch"
        expected_call = {
            "package": package_id,
            "module": module_name,
            "function": function_name,
        }
        if not any(
            _normalise_address(call["package"]) == expected_call["package"]
            and call["module"] == expected_call["module"]
            and call["function"] == expected_call["function"]
            for call in _move_calls(result)
        ):
            raise SuiVerificationError("Transaction does not call the configured TerraNode Move function")

        object_type = f"{package_id}::{module_name}::ProduceBatch".lower()
        object_changes = result.get("objectChanges") or []
        relevant_changes = [
            change
            for change in object_changes
            if str(change.get("objectType", "")).lower() == object_type
        ]
        if function_name == "mint_batch":
            relevant_changes = [change for change in relevant_changes if change.get("type") == "created"]
        else:
            relevant_changes = [
                change
                for change in relevant_changes
                if change.get("type") in {"mutated", "transferred"}
            ]
        object_ids = {_normalise_address(change.get("objectId")) for change in relevant_changes}
        object_ids.discard(None)
        if expected_object_id:
            object_id = _normalise_address(expected_object_id)
            if object_id not in object_ids:
                raise SuiVerificationError("Transaction did not mutate the expected ProduceBatch object")
        elif len(object_ids) == 1:
            object_id = next(iter(object_ids))
        else:
            raise SuiVerificationError("Transaction does not create exactly one ProduceBatch object")

        object_result = _rpc_call(
            "sui_getObject",
            [object_id, {"showType": True, "showOwner": True, "showContent": True}],
            rpc_url,
        )
        object_data = object_result.get("data") or {}
        if str(object_data.get("type", "")).lower() != object_type:
            raise SuiVerificationError("Final object type does not match the configured TerraNode package")
        fields = (object_data.get("content") or {}).get("fields") or {}

        if not expected_batch:
            raise SuiVerificationError("Local batch expectations are required for verification")
        expected_hash = bytes.fromhex(expected_batch.data_integrity_hash)
        expected_owner = expected_recipient or expected_sender
        expected_fields = {
            "crop_type": expected_batch.crop_type,
            "weight_grams": expected_batch.weight_grams,
            "origin_farmer_address": expected_batch.farmer.sui_public_key,
            "current_custodian_address": expected_owner,
            "data_integrity_hash": expected_hash,
        }
        for field_name, expected_value in expected_fields.items():
            if not _field_matches(fields.get(field_name), expected_value):
                raise SuiVerificationError(f"On-chain field mismatch: {field_name}")
        if _normalise_address(_object_owner_address(object_data.get("owner"))) != _normalise_address(expected_owner):
            raise SuiVerificationError("Final object owner does not match the expected custodian")

        event_name = "BatchMinted" if function_name == "mint_batch" else "CustodyTransferred"
        event_fields = (
            {
                "batch_id": object_id,
                "farmer": expected_batch.farmer.sui_public_key,
                "crop_type": expected_batch.crop_type,
                "weight_grams": expected_batch.weight_grams,
                "data_integrity_hash": expected_hash,
            }
            if function_name == "mint_batch"
            else {
                "batch_id": object_id,
                "from": expected_sender,
                "to": expected_recipient,
                "weight_grams": expected_batch.weight_grams,
            }
        )
        if not _event_matches(result.get("events"), package_id, module_name, event_name, event_fields):
            raise SuiVerificationError(f"Expected {event_name} event was not emitted with matching fields")

        return {
            "verified": True,
            "reason_code": "verified",
            "digest": tx_digest,
            "chain_id": chain_id,
            "sender": _normalise_address(sender),
            "object_id": object_id,
            "package_id": package_id,
            "module": module_name,
            "function": function_name,
        }
    except SuiRPCUnavailable as exc:
        return {"verified": False, "reason_code": "rpc_unavailable", "error": str(exc)}
    except (SuiVerificationError, ValueError) as exc:
        return {"verified": False, "reason_code": "verification_failed", "error": str(exc)}
