import hashlib
import json
import os
import urllib.error
import urllib.request

from apps.telemetry.encryption_service import read_telemetry_values
from apps.telemetry.services import generate_telemetry_hash


DEFAULT_SUI_GRAPHQL_URL = "https://graphql.testnet.sui.io/graphql"
DEFAULT_TESTNET_CHAIN_ID = "69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD"
LEGACY_TESTNET_CHAIN_ID = "4c78adac"
DEFAULT_PACKAGE_ID = ""
DEFAULT_MODULE_NAME = "agri_ledger"
INCOMPATIBLE_PACKAGE_IDS = {
    "0x12d791039ab75e08f41140ccb9be4ce80b917f3eb2b52dab150831bc29afb92f",
}

TRANSACTION_QUERY = """
query TerraNodeTransaction($digest: String!) {
  chainIdentifier
  transaction(digest: $digest) {
    digest
    sender { address }
    transactionJson
    effects {
      status
      objectChanges(first: 100) {
        nodes {
          address
          idCreated
          outputState {
            owner {
              __typename
              ... on AddressOwner { address { address } }
            }
            asMoveObject { contents { type { repr } json } }
          }
        }
      }
      events(first: 100) {
        nodes { contents { type { repr } json } }
      }
    }
  }
}
"""

OBJECT_QUERY = """
query TerraNodeObject($address: SuiAddress!) {
  chainIdentifier
  object(address: $address) {
    owner {
      __typename
      ... on AddressOwner { address { address } }
    }
    asMoveObject { contents { type { repr } json } }
  }
}
"""


class SuiRPCUnavailable(RuntimeError):
    """The configured Sui data service could not provide a usable response."""


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


def _graphql_call(query, variables, graphql_url=None):
    endpoint = graphql_url or os.environ.get("SUI_GRAPHQL_URL") or DEFAULT_SUI_GRAPHQL_URL
    request = urllib.request.Request(
        endpoint,
        data=json.dumps({"query": query, "variables": variables}).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "TerraNode-Sui-Verifier/3.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (
        urllib.error.URLError,
        TimeoutError,
        OSError,
        UnicodeDecodeError,
        json.JSONDecodeError,
    ) as exc:
        raise SuiRPCUnavailable(f"Sui GraphQL is unavailable: {exc}") from exc
    if payload.get("errors"):
        raise SuiVerificationError(f"Sui GraphQL rejected the query: {payload['errors']}")
    data = payload.get("data")
    if not isinstance(data, dict):
        raise SuiVerificationError("Sui GraphQL returned no data")
    return data


def _hash_bytes(value):
    if isinstance(value, list) and all(
        isinstance(item, int) and 0 <= item <= 255 for item in value
    ):
        return bytes(value)
    if isinstance(value, str):
        stripped = value[2:] if value.startswith("0x") else value
        try:
            return bytes.fromhex(stripped)
        except ValueError:
            return value.encode("utf-8")
    return None


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


def _owner_address(owner):
    if not isinstance(owner, dict) or owner.get("__typename") != "AddressOwner":
        return None
    address = owner.get("address")
    return address.get("address") if isinstance(address, dict) else None


def _move_calls(transaction_json):
    kind = (transaction_json or {}).get("kind") or {}
    programmable = kind.get("programmableTransaction") or {}
    calls = []
    for command in programmable.get("commands") or []:
        move_call = command.get("moveCall") if isinstance(command, dict) else None
        if isinstance(move_call, dict):
            calls.append(
                {
                    "package": move_call.get("package"),
                    "module": move_call.get("module"),
                    "function": move_call.get("function"),
                }
            )
    return calls


def _object_changes(effects):
    changes = []
    for change in ((effects or {}).get("objectChanges") or {}).get("nodes") or []:
        output = change.get("outputState") or {}
        contents = ((output.get("asMoveObject") or {}).get("contents")) or {}
        changes.append(
            {
                "type": "created" if change.get("idCreated") else "mutated",
                "objectType": (contents.get("type") or {}).get("repr"),
                "objectId": change.get("address"),
                "owner": _owner_address(output.get("owner")),
                "fields": contents.get("json") or {},
            }
        )
    return changes


def _events(effects):
    events = []
    for event in ((effects or {}).get("events") or {}).get("nodes") or []:
        contents = event.get("contents") or {}
        events.append(
            {
                "type": (contents.get("type") or {}).get("repr"),
                "parsedJson": contents.get("json") or {},
            }
        )
    return events


def _event_matches(events, package_id, module_name, event_name, expected_fields):
    expected_type = f"{package_id}::{module_name}::{event_name}".lower()
    for event in events:
        if str(event.get("type", "")).lower() != expected_type:
            continue
        parsed = event.get("parsedJson") or {}
        if all(
            _field_matches(parsed.get(key), expected)
            for key, expected in expected_fields.items()
        ):
            return True
    return False


def _valid_testnet_chain(actual, configured):
    return actual == configured or (
        configured == LEGACY_TESTNET_CHAIN_ID and actual == DEFAULT_TESTNET_CHAIN_ID
    )


def generate_batch_integrity_hash(farmer_id, crop_type, weight_grams):
    canonical_batch = json.dumps(
        {
            "crop_type": crop_type,
            "farmer_id": str(farmer_id),
            "weight_grams": int(weight_grams),
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(canonical_batch).hexdigest()


def compute_expected_integrity_hash(batch):
    telemetry = batch.origin_telemetry
    if not telemetry:
        return generate_batch_integrity_hash(
            batch.farmer_id,
            batch.crop_type,
            batch.weight_grams,
        )
    values = read_telemetry_values(
        telemetry,
        enforce_authorization=False,
        system_purpose="ledger_integrity",
    )
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
    verify_current_state=True,
    graphql_url=None,
    rpc_url=None,
):
    """Strict, fail-closed verification through Sui's supported GraphQL API."""
    if not tx_digest or "SIMULATED" in str(tx_digest).upper():
        return {
            "verified": False,
            "reason_code": "invalid_digest",
            "error": "A real Sui transaction digest is required",
        }
    try:
        package_id = _normalise_address(
            _configured_value("SUI_PACKAGE_ID", DEFAULT_PACKAGE_ID)
        )
        module_name = _configured_value("SUI_MODULE_NAME", DEFAULT_MODULE_NAME)
        expected_chain_id = _configured_value(
            "SUI_TESTNET_CHAIN_ID", DEFAULT_TESTNET_CHAIN_ID
        )
        if not package_id:
            raise SuiVerificationError("SUI_PACKAGE_ID is not a valid Sui address")
        if package_id in INCOMPATIBLE_PACKAGE_IDS:
            raise SuiVerificationError(
                "SUI_PACKAGE_ID uses TerraNode's obsolete weight_kg contract ABI; "
                "publish the current Move package and update configuration"
            )

        endpoint = graphql_url or rpc_url
        data = _graphql_call(TRANSACTION_QUERY, {"digest": tx_digest}, endpoint)
        chain_id = data.get("chainIdentifier")
        if not _valid_testnet_chain(chain_id, expected_chain_id):
            raise SuiVerificationError(
                f"Wrong Sui network: expected {expected_chain_id}, got {chain_id}"
            )
        transaction = data.get("transaction")
        if not isinstance(transaction, dict):
            raise SuiVerificationError("Sui transaction was not found")
        effects = transaction.get("effects")
        if not isinstance(effects, dict) or effects.get("status") != "SUCCESS":
            raise SuiVerificationError("Transaction did not succeed")

        transaction_json = transaction.get("transactionJson") or {}
        sender = ((transaction.get("sender") or {}).get("address")
                  or transaction_json.get("sender"))
        if not expected_sender or _normalise_address(sender) != _normalise_address(
            expected_sender
        ):
            raise SuiVerificationError(
                "Transaction sender does not match the authenticated custodian wallet"
            )

        function_name = expected_function or "mint_batch"
        if not any(
            _normalise_address(call["package"]) == package_id
            and call["module"] == module_name
            and call["function"] == function_name
            for call in _move_calls(transaction_json)
        ):
            raise SuiVerificationError(
                "Transaction does not call the configured TerraNode Move function"
            )

        object_type = f"{package_id}::{module_name}::ProduceBatch".lower()
        relevant_changes = [
            change
            for change in _object_changes(effects)
            if str(change.get("objectType", "")).lower() == object_type
        ]
        if function_name == "mint_batch":
            relevant_changes = [
                change for change in relevant_changes if change["type"] == "created"
            ]
        object_ids = {
            _normalise_address(change.get("objectId")) for change in relevant_changes
        }
        object_ids.discard(None)
        if expected_object_id:
            object_id = _normalise_address(expected_object_id)
            if object_id not in object_ids:
                raise SuiVerificationError(
                    "Transaction did not change the expected ProduceBatch object"
                )
        elif len(object_ids) == 1:
            object_id = next(iter(object_ids))
        else:
            raise SuiVerificationError(
                "Transaction does not create exactly one ProduceBatch object"
            )

        if not expected_batch:
            raise SuiVerificationError(
                "Local batch expectations are required for verification"
            )
        expected_hash = bytes.fromhex(expected_batch.data_integrity_hash)
        expected_owner = expected_recipient or expected_sender
        event_name = (
            "BatchMinted" if function_name == "mint_batch" else "CustodyTransferred"
        )
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
        if not _event_matches(
            _events(effects), package_id, module_name, event_name, event_fields
        ):
            raise SuiVerificationError(
                f"Expected {event_name} event was not emitted with matching fields"
            )

        matching_changes = [
            change
            for change in relevant_changes
            if _normalise_address(change.get("objectId")) == object_id
        ]
        if not any(
            _normalise_address(change.get("owner"))
            == _normalise_address(expected_owner)
            for change in matching_changes
        ):
            raise SuiVerificationError(
                "Transaction object-change owner does not match the expected recipient"
            )

        if verify_current_state:
            object_data = _graphql_call(
                OBJECT_QUERY, {"address": object_id}, endpoint
            )
            if not _valid_testnet_chain(
                object_data.get("chainIdentifier"), expected_chain_id
            ):
                raise SuiVerificationError("Object query returned the wrong Sui network")
            current_object = object_data.get("object")
            if not isinstance(current_object, dict):
                raise SuiVerificationError("Current ProduceBatch object was not found")
            contents = (
                ((current_object.get("asMoveObject") or {}).get("contents")) or {}
            )
            if str((contents.get("type") or {}).get("repr", "")).lower() != object_type:
                raise SuiVerificationError(
                    "Final object type does not match the configured TerraNode package"
                )
            fields = contents.get("json") or {}
            expected_fields = {
                "crop_type": expected_batch.crop_type,
                "weight_grams": expected_batch.weight_grams,
                "origin_farmer_address": expected_batch.farmer.sui_public_key,
                "current_custodian_address": expected_owner,
                "data_integrity_hash": expected_hash,
            }
            for field_name, expected_value in expected_fields.items():
                if not _field_matches(fields.get(field_name), expected_value):
                    raise SuiVerificationError(
                        f"On-chain field mismatch: {field_name}"
                    )
            if _normalise_address(
                _owner_address(current_object.get("owner"))
            ) != _normalise_address(expected_owner):
                raise SuiVerificationError(
                    "Final object owner does not match the expected custodian"
                )

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
            "current_state_checked": verify_current_state,
            "transport": "graphql",
        }
    except SuiRPCUnavailable as exc:
        return {
            "verified": False,
            "reason_code": "rpc_unavailable",
            "error": str(exc),
        }
    except (SuiVerificationError, ValueError) as exc:
        return {
            "verified": False,
            "reason_code": "verification_failed",
            "error": str(exc),
        }
