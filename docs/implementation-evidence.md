# TerraNode implementation evidence

Evidence date: 2026-09-01

## Status meanings

- Verified: exercised successfully by an automated check in the stated environment.
- Partial: implementation and some automated evidence exist, but the complete deployed workflow was not exercised.
- Blocked: required external tooling, credentials, or service was unavailable in this environment.
- Not measured: no result is claimed.

## Functional requirements

| ID | Thesis requirement | Implementation evidence | Automated evidence | Status |
|---|---|---|---|---|
| FR-01 | Register with email, password, and role | apps/users/serializers.py; frontend/src/pages/RegisterPage.tsx | users registration and public-role security tests | Verified |
| FR-02 | JWT authentication and role-based access control | apps/users/views.py; apps/users/permissions.py; guards/RoleGuard.tsx | login, logout, throttling, ledger isolation, telemetry isolation, and admin endpoint tests | Verified |
| FR-03 | Sui wallet authentication with Ed25519 verification | apps/users/models.py; apps/users/views.py; frontend login/settings challenge signing | apps/users/tests_phase1.py covers exact signature, address derivation, expiry/single use, binding, invalid address, and unknown wallet | Verified in backend; live browser-wallet signing is Partial |
| FR-04 | Capture temperature, soil moisture, and soil pH | apps/telemetry; import_nasa_power; DataProvenance and ImportRun | telemetry API/range tests and committed NASA POWER fixture tests | Verified |
| FR-05 | Generate SHA-256 integrity hashes | telemetry/services.py and encryption_service.py | canonical versioning, encryption, tamper, migration, and audit tests | Verified |
| FR-06 | Create produce batches linked to telemetry | ledger models, serializers, and prepare endpoint | strict ledger workflow tests | Verified |
| FR-07 | Mint produce batch objects on Sui | contracts/sources/agri_ledger.move; MintBatchPage; strict GraphQL verifier | mocked GraphQL verifier/confirmation tests; obsolete package rejection test | Partial: current package is not published and no real TerraNode mint was executed |
| FR-08 | Track custody transfers between stakeholders | Move transfer_custody; CustodyTransfer model; transfer/timeline APIs | authorization, lifecycle, digest uniqueness, event/object, historical ownership, and public-verification tests | Partial: local workflow is verified; current contract is not published and no real transfer was executed |
| FR-09 | Compute yield predictions from historical telemetry | analytics/services.py; Redis cache with 600-second TTL and invalidation | sufficient/insufficient data, crop-specific cache, invalidation, and outage fallback tests | Verified for the labelled WMA rule-based estimate |
| FR-10 | Role-specific farmer, logistics, and admin dashboards | frontend routes/pages and real backend admin/ledger/telemetry APIs | production build, role/API backend tests, and 2 Chromium API-contract E2E tests | Partial: farmer contract E2E is automated; full-stack logistics/admin browser flows remain unexecuted |

## Non-functional requirements

| ID | Thesis requirement | Evidence | Status |
|---|---|---|---|
| NFR-01 | Argon2id password hashing | PASSWORD_HASHERS selects Argon2 first; runtime verification returned algorithm argon2 | Verified |
| NFR-02 | Standard API operations under 500 ms | Benchmark requires an explicitly deployed endpoint and currently reports skipped | Not measured |
| NFR-03 | Responsive modern-browser interface | TypeScript production build and two Chromium Playwright tests pass | Partial: no formal accessibility or multi-browser audit |
| NFR-04 | Sui transactions within normal Testnet finality | Live GraphQL chain query measured, but no current-package mint/transfer digest exists | Blocked |
| NFR-05 | Authentication throttling at 5 attempts per minute | User authentication test accepts five failures and returns HTTP 429 on the sixth | Verified |
| NFR-06 | Physically plausible telemetry ranges | Serializer and API tests cover temperature, moisture, pH, partial observations, and invalid input | Verified |

## Verification runs

| Check | Result | Scope and caveat |
|---|---:|---|
| Django full suite | 48/48 passed in 8.653 s | Development settings and temporary SQLite test database; not PostgreSQL |
| Django system check | Passed, 0 issues | Development configuration |
| Migration drift | No changes detected | Model state matches committed migrations |
| Local schema migration | Applied successfully | Existing developer SQLite database; all new migrations now applied |
| Telemetry encryption dry run | 186/186 verified, 0 errors | Temporary process-only test key; production secret still must be configured |
| Frontend TypeScript/Vite build | Passed | 2,361 modules; bundle-size warning remains |
| Frontend oxlint | Passed | No reported lint errors |
| Playwright Chromium | 2/2 passed | Mocked backend API contract, not a live PostgreSQL/Redis/Sui stack |
| Sui GraphQL chain query | 3/3 measured | Public Testnet endpoint; mean 512.160 ms |
| Move build/tests | Not run | Sui CLI unavailable in this environment |
| Docker Compose config/runtime | Not run | Docker unavailable in this environment |
| PostgreSQL backend suite | Not run | PostgreSQL client/server and Docker unavailable |
| Redis integration/latency | Not run | Redis unavailable; local-memory cache was measured and labelled accordingly |
| Real TerraNode mint/transfer | Not run | Current weight_grams contract is not published; legacy package is rejected |

## Benchmark evidence

Latest result: docs/benchmark-results.json

Timestamped result: docs/benchmarks/benchmark-20260901T052055Z.json and matching CSV.

| Metric | Samples | Mean | Notes |
|---|---:|---:|---|
| SHA-256 | 200 | 0.004669 ms | Canonical 175-byte payload |
| AES-256-GCM encryption | 200 | 0.097164 ms | Fresh 96-bit nonce per operation |
| AES-256-GCM decrypt and parse | 200 | 0.043993 ms | Includes authenticated decryption and JSON parsing |
| Django cache get | 200 | 0.017380 ms | LocMemCache, explicitly not Redis |
| Sui Testnet GraphQL chain identifier | 3 | 512.159667 ms | Public development endpoint |
| Deployed API latency | 0 | Not measured | No deployed endpoint supplied |
| Real transaction lookup | 0 | Not measured | No compatible TerraNode digest supplied |

## Deployment blockers and required next evidence

1. Install Docker and run the full suite against the Compose PostgreSQL and Redis services.
2. Install a current Sui CLI, run sui move build and sui move test, and preserve their exact version/output.
3. Publish contracts/sources/agri_ledger.move as a new Testnet package. The package in contracts/Published.toml is the incompatible v1 ABI and is intentionally rejected by frontend and backend.
4. Configure the new package ID and production secrets.
5. Run a real farmer mint and farmer-to-logistics transfer, then record the digests, object ID, GraphQL verification output, and observed finality.
6. Run the full live browser workflow for farmer, logistics, admin, and public verification.
7. Run controlled deployed API and Redis cached/uncached benchmarks before retaining any sub-500-ms thesis claim.

Until those steps are complete, the system should be described as locally verified with deployment gates, not as fully deployed end to end.
