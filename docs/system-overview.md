# TerraNode system overview

## What TerraNode is

TerraNode is an agricultural telemetry, yield-estimation, and produce-traceability system. Sui is used as a tamper-resistant record of batch creation and custody changes. ProduceBatch is a traceability object; the application does not create a coin, payment system, marketplace, or trading asset.

## Main data flow

1. A farmer account submits a genuine sensor/manual observation or an administrator imports NASA POWER weather observations.
2. The backend validates the observed values and records their provenance. A missing observation stays null; TerraNode does not invent soil pH or derive soil moisture from rainfall.
3. Sensitive telemetry values are canonically serialized, hashed with SHA-256, and encrypted with AES-256-GCM before storage.
4. The analytics service uses sufficient real temperature and soil-moisture observations to produce a labelled WMA rule-based yield estimate. It returns an insufficient-data response when the evidence is inadequate.
5. A farmer prepares a produce batch in PostgreSQL, signs a mint transaction with the wallet bound to that account, and submits the transaction to Sui Testnet.
6. The backend verifies the transaction, event, created object, sender, package, function, weight in grams, crop, integrity hash, owner, and current object fields before changing PENDING to MINTED.
7. Only the current custodian can transfer the on-chain object. The backend verifies each transfer and records a persistent CustodyTransfer audit row before progressing through IN_TRANSIT and DELIVERED.
8. Public verification rechecks the local hash, mint digest, every transfer digest, custody sequence, and current on-chain object. Any missing or inconsistent proof produces verified=false.

## Why PostgreSQL and Redis are both present

| Component | Purpose | Source of truth? | What happens if unavailable? |
|---|---|---:|---|
| PostgreSQL | Users, encrypted telemetry, provenance, batches, custody transfers, challenges, and audit events | Yes | Core reads and writes stop; the service should report database failure |
| Redis cache | Stores WMA prediction results for 600 seconds | No | Predictions are recomputed from PostgreSQL |
| Redis broker | Delivers Celery background integrity-audit jobs | No | Scheduled jobs pause/fail visibly; the standalone management command still works |
| Sui Testnet | External proof of batch minting and custody ownership | External proof | Confirmation and transfer fail closed; no simulated digest is accepted |

Redis exists to make repeated calculations faster and to transport background jobs. It must never contain the only copy of agricultural or custody data.

## Trust boundaries

- Password authentication uses Argon2id and short-lived JWT access tokens.
- Wallet authentication uses a server-generated, short-lived, single-use challenge. The server verifies the Ed25519 signature and derives the Sui address; an address typed by a client is not trusted as ownership proof.
- Public registration permits farmer and logistics roles only. Administrator accounts must be provisioned by an administrator.
- Telemetry decryption is centralized in the telemetry service and checks authorization.
- AES-GCM authentication failures and integrity mismatches create security/audit evidence.
- A Sui transaction digest is single-use in the local ledger.
- PostgreSQL is authoritative for application state, while Sui is authoritative for the existence and ownership of the traceability object.

## Real data and demo data

The import_nasa_power command stores provider metadata, coordinates, units, time standard, source URL, import status, and the SHA-256 checksum of the exact raw response. The seed_demo_data command produces explicitly SYNTHETIC records. Production dashboards do not silently substitute mock records; demo behavior requires VITE_DEMO_MODE=true and must be visibly labelled.

## Supported Sui transports

The browser wallet and transaction path uses the current Sui gRPC client through the current dApp Kit. Backend verification and historical lookups use Sui GraphQL. Deprecated Sui JSON-RPC calls are not used.

The package recorded in contracts/Published.toml is legacy metadata. Its v1 ABI contains weight_kg and a borrowed-object transfer and is incompatible with the current weight_grams ownership-transfer workflow. Both frontend and backend reject that package ID. The current Move source must be compiled, tested, and published as a new Testnet package before live minting is enabled.
