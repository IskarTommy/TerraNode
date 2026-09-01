# TerraNode deployment and verification

## Prerequisites

- Docker Engine with Docker Compose v2
- A Sui CLI version compatible with the current Testnet
- A funded Testnet wallet used only for deployment and operational signing
- A dedicated Sui GraphQL/gRPC provider for production traffic; public endpoints are suitable for development and validation

Never commit a mnemonic, private key, database password, Django secret, AES key, access token, or generated database volume.

## Configure secrets

1. Copy .env.compose.example to .env.compose.
2. Replace every placeholder.
3. Generate DJANGO_SECRET_KEY with at least 50 random characters.
4. Generate TELEMETRY_ENCRYPTION_KEY_V1 as base64 of exactly 32 random bytes.
5. URL-encode the PostgreSQL password inside DATABASE_URL.
6. Leave SUI_PACKAGE_ID unset or as the placeholder until the current Move source has been published. Do not use the legacy package recorded in contracts/Published.toml.

Example local secret-generation commands:

    python -c "import secrets; print(secrets.token_urlsafe(64))"
    python -c "import base64,secrets; print(base64.b64encode(secrets.token_bytes(32)).decode())"

Store the generated values in the deployment secret manager or untracked .env.compose file, not in source control.

## Compile, test, and publish the current Move package

The current source changes the stored weight field to grams and transfers object ownership. It is not ABI-compatible with the legacy v1 deployment.

1. Select and verify Testnet:

       sui client active-env
       sui client switch --env testnet

2. Compile and run Move tests:

       cd contracts
       sui move build
       sui move test

3. Review the sender address, active environment, gas balance, and current source.
4. Publish the current package as a new Testnet package using the installed CLI's current publish command.
5. Record the resulting package ID. Do not store the wallet private key in the repository.
6. Replace SUI_PACKAGE_ID in .env.compose and VITE_SUI_PACKAGE_ID in any non-Compose frontend environment.
7. Replace or regenerate contracts/Published.toml so it describes the new compatible package.
8. Perform one real mint and transfer smoke test and retain the digests as deployment evidence.

The backend accepts a transaction only when GraphQL proves the exact package, agri_ledger module, function, sender, event, object type, integer gram weight, crop, addresses, integrity hash, success status, and current owner.

## Start PostgreSQL, Redis, Django, Celery, and the frontend

From the repository root:

    docker compose --env-file .env.compose config
    docker compose --env-file .env.compose up --build -d
    docker compose --env-file .env.compose ps

The backend service applies Django migrations before starting Gunicorn. PostgreSQL is the authoritative store. Redis database 0 is used for cache and Celery in this Compose topology.

Useful checks:

    docker compose --env-file .env.compose exec backend python manage.py check
    docker compose --env-file .env.compose exec backend python manage.py showmigrations
    docker compose --env-file .env.compose exec backend python manage.py test
    docker compose --env-file .env.compose logs backend celery celery-beat

The application is exposed at http://localhost:8080. The frontend proxies /api requests to the backend service.

## Import genuine NASA POWER data

Review command help first:

    docker compose --env-file .env.compose exec backend python manage.py import_nasa_power --help

Use a Ghana reference preset or explicit latitude/longitude and date range. An import is transactional and idempotent. NASA POWER weather fields remain partial where the provider has no measurement. Soil pH must come from a separate manual, lab, or sensor source with its own provenance.

Synthetic records are created only by seed_demo_data and remain labelled SYNTHETIC.

## Encrypt existing telemetry safely

Take and verify a PostgreSQL backup before changing legacy rows.

1. Validate without writes:

       docker compose --env-file .env.compose exec backend python manage.py migrate_telemetry_encryption --dry-run

2. Encrypt in batches while retaining legacy plaintext:

       docker compose --env-file .env.compose exec backend python manage.py migrate_telemetry_encryption

3. Run the integrity audit:

       docker compose --env-file .env.compose exec backend python manage.py audit_telemetry_integrity

4. Exercise authorized read paths and verify the backup.
5. Only then run the explicit clear-plaintext finalization:

       docker compose --env-file .env.compose exec backend python manage.py migrate_telemetry_encryption --clear-plaintext

Key rotation uses a new versioned environment variable and key_version metadata. Do not remove an old key while rows still reference it.

## Required live smoke test

1. Register a farmer and a logistics stakeholder.
2. Sign in and bind each Sui wallet through a server challenge.
3. Import or submit genuine telemetry and verify provenance and encrypted storage.
4. Request a WMA yield estimate with sufficient observations, then repeat it and confirm Redis cache behavior.
5. Prepare and sign a real mint. Confirm the resulting digest and object ID.
6. Sign a farmer-to-logistics custody transfer and confirm the object owner and local timeline.
7. Run public verification and confirm every local and on-chain check is true.
8. Stop Redis and confirm prediction still computes while health reports Redis degraded.
9. Tamper with a disposable test record, run the integrity audit, confirm an alert, then restore/delete the disposable test data through an approved recovery procedure.

## Benchmark evidence

Run:

    pipenv run python ..\run_benchmarks.py --iterations 500 --network-iterations 5

Run it from backend, or invoke run_benchmarks.py with the same Pipenv interpreter. Pass --api-benchmark-url only for a deployed endpoint you are authorized to test, and pass --tx-digest to measure a real Testnet lookup. The script deliberately does not claim Redis, API, or transaction latency when those systems are not actually measured.
