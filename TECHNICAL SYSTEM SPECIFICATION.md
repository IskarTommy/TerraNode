# TECHNICAL SYSTEM SPECIFICATION: TERRANODE

**Project Title:** Secure and Analytics-Driven Agricultural Data Management Platform
**System Version:** 1.0.0
**Target Environment:** Cross-Platform Web (React + TypeScript / Django + DRF / PostgreSQL / Redis / Sui Blockchain)

---

## 1. ARCHITECTURAL OVERVIEW

TerraNode utilizes a hybrid architectural topology designed to balance the high-throughput
requirements of real-time environmental data processing with the strict immutability
guarantees required for decentralized supply chain provenance.

The application architecture isolates tasks into four distinct layers:

- **The Storage & Analytics Layer (Django + PostgreSQL):** Manages relational database
  structures, user sessions, role-based access tokens, historical environmental telemetry,
  and runs the predictive mathematical modules for harvest forecasting.

- **The Caching & Message Layer (Redis via Upstash):** Provides microsecond-latency
  in-memory storage for JWT blacklisting, API rate-limit counters, analytics result caching,
  and serves as the Celery task broker for asynchronous background jobs.

- **The Trust & Provenance Layer (Sui Network + Move):** Operates as a decentralized,
  immutable ledger where agricultural crop batches are minted as unique, programmable
  cryptographic objects. This layer records ownership transfers and data integrity
  verification hashes.

- **The Presentation Layer (React + TypeScript + Vite):** Provides responsive dashboards
  tailored to specific user roles, visualizing analytical telemetry using Recharts and
  executing on-chain transactions via client-side Sui wallet integration.

### 1.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                          │
│              React 18 + TypeScript + Vite (Vercel)                 │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Login/  │  │   Farmer     │  │ Logistics│  │    Admin      │  │
│  │ Register │  │  Dashboard   │  │Dashboard │  │  Dashboard    │  │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └──────┬────────┘  │
│       │               │               │               │            │
│       └───────────────┼───────────────┼───────────────┘            │
│                       │               │                            │
│              ┌────────┴────────┐  ┌───┴──────────┐                 │
│              │ Axios + JWT     │  │ @mysten/     │                 │
│              │ Interceptor     │  │ dapp-kit     │                 │
│              └────────┬────────┘  └───┬──────────┘                 │
└───────────────────────┼───────────────┼────────────────────────────┘
                        │ HTTPS         │ RPC
                        ▼               ▼
┌───────────────────────────────┐  ┌──────────────────────────┐
│     STORAGE & ANALYTICS       │  │  TRUST & PROVENANCE      │
│   Django 5 + DRF (Render)     │  │  Sui Testnet             │
│                               │  │                          │
│  ┌─────────┐ ┌─────────────┐ │  │  ┌────────────────────┐  │
│  │  Users   │ │  Telemetry  │ │  │  │  agri_ledger.move  │  │
│  │ Domain   │ │  Domain     │ │  │  │                    │  │
│  ├─────────┤ ├─────────────┤ │  │  │  - mint_batch()    │  │
│  │ Ledger  │ │  Analytics  │ │  │  │  - transfer_       │  │
│  │ Domain  │ │  Domain     │ │  │  │    custody()       │  │
│  └────┬────┘ └──────┬──────┘ │  │  └────────────────────┘  │
│       │              │        │  └──────────────────────────┘
│       ▼              ▼        │
│  ┌──────────────────────────┐ │
│  │  PostgreSQL (Neon)       │ │
│  │  - users                 │ │
│  │  - environmental_        │ │
│  │    telemetry             │ │
│  │  - produce_batches       │ │
│  └──────────────────────────┘ │
│                               │
│  ┌──────────────────────────┐ │
│  │  Redis (Upstash)         │ │
│  │  - JWT blacklist         │ │
│  │  - Rate limit counters   │ │
│  │  - Analytics cache       │ │
│  │  - Celery task broker    │ │
│  └──────────────────────────┘ │
└───────────────────────────────┘
```

---

## 2. USER ROLE & AUTHENTICATION MATRIX

The system enforces strict Role-Based Access Control (RBAC) across three distinct
functional user groups. Cryptographic actions require an active Sui network address.

| User Role | Primary Responsibilities | Database Access | Blockchain Permissions |
|---|---|---|---|
| **Smallholder Farmer** | Log environmental metrics, view yield analysis, initiate harvest batches | Read/Write (Assigned Lands) | `mint_batch` |
| **Logistics Handler** | Update transport status, confirm batch receipts, handle shipping | Read-Only (Logs) / Write (Status) | `transfer_custody` |
| **System Administrator** | System health monitoring, anomaly audit, master data control | Full Read/Write Access | Full Contract Audit |

### 2.1 Authentication Flow

```
┌──────────┐     POST /auth/register/      ┌──────────┐
│  Client  │ ───────────────────────────►   │  Django  │
│          │     { email, password, role }   │          │
│          │ ◄───────────────────────────    │          │
│          │     201 { user_id }             │          │
│          │                                 │          │
│          │     POST /auth/login/           │          │
│          │ ───────────────────────────►    │          │  ┌─────────┐
│          │     { email, password }         │          │──│  Redis  │
│          │ ◄───────────────────────────    │          │  │         │
│          │     200 { access, refresh }     │          │  │ (check  │
│          │                                 │          │  │  black- │
│          │     GET /api/v1/telemetry/      │          │  │  list)  │
│          │     Authorization: Bearer xxx   │          │  └─────────┘
│          │ ───────────────────────────►    │          │
│          │ ◄───────────────────────────    │          │
│          │     200 { data }                │          │
│          │                                 │          │
│          │     POST /auth/logout/          │          │
│          │ ───────────────────────────►    │          │
│          │     { refresh_token }           │          │──► Redis: SETEX blacklist:{jti} TTL
│          │ ◄───────────────────────────    │          │
│          │     200 OK                      │          │
└──────────┘                                 └──────────┘
```

### 2.2 JWT Token Configuration

| Token Type | Lifetime | Storage | Rotation |
|---|---|---|---|
| Access Token | 15 minutes | Client memory (NOT localStorage) | Re-issued via refresh |
| Refresh Token | 7 days | httpOnly cookie or secure storage | Rotated on every use (old token blacklisted in Redis) |

---

## 3. RELATIONAL DATABASE SCHEMA (POSTGRESQL)

The local relational database handles dense historical telemetry records. To maintain state
alignment with the blockchain, specific tables include fields for on-chain cryptographic
object identifiers.

### 3.1 User Registry Table (`users`)

| Field | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique internal system identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User authentication identity |
| `password_hash` | VARCHAR(512) | NOT NULL | Argon2id secure password hash |
| `full_name` | VARCHAR(200) | NOT NULL | Display name |
| `role` | VARCHAR(20) | NOT NULL, CHECK IN ('FARMER','LOGISTICS','ADMIN') | Explicit role definition |
| `sui_public_key` | VARCHAR(66) | NULLABLE | User's Sui wallet address (0x-prefixed) |
| `is_active` | BOOLEAN | DEFAULT TRUE | Soft-delete flag |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

### 3.2 Telemetry Logging Table (`environmental_telemetry`)

| Field | Type | Constraints | Description |
|---|---|---|---|
| `log_id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique record identifier |
| `farmer_id` | UUID | FOREIGN KEY → `users.user_id`, NOT NULL | Tracks data origin |
| `recorded_at` | TIMESTAMPTZ | DEFAULT NOW() | Automated server insertion timestamp |
| `temperature_celsius` | NUMERIC(5,2) | NOT NULL | Local ambient temperature metric |
| `soil_moisture_percentage` | NUMERIC(5,2) | NOT NULL | Localized soil saturation level |
| `soil_ph` | NUMERIC(4,2) | NOT NULL | Acid-base index of targeted agricultural plot |
| `payload_sha256` | CHAR(64) | NOT NULL | SHA-256 hash of the canonical record for auditability |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Database insertion timestamp |

**Indexes:**
- `idx_telemetry_farmer` on `farmer_id` — fast farmer-scoped queries
- `idx_telemetry_recorded` on `recorded_at` — efficient time-range filtering

### 3.3 Produce Batch Table (`produce_batches`)

| Field | Type | Constraints | Description |
|---|---|---|---|
| `batch_id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique batch identifier |
| `farmer_id` | UUID | FOREIGN KEY → `users.user_id`, NOT NULL | Originating farmer |
| `crop_type` | VARCHAR(100) | NOT NULL | Type of crop (e.g., "Maize", "Cassava") |
| `weight_kg` | NUMERIC(10,2) | NOT NULL | Batch weight in kilograms |
| `data_integrity_hash` | CHAR(64) | NOT NULL | SHA-256 from linked telemetry record |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING', CHECK IN ('PENDING','MINTED','IN_TRANSIT','DELIVERED') | Current lifecycle state |
| `sui_object_id` | VARCHAR(66) | NULLABLE | Sui Object ID (filled after on-chain mint) |
| `sui_tx_digest` | VARCHAR(66) | NULLABLE | Sui transaction digest hash |
| `current_custodian_id` | UUID | FOREIGN KEY → `users.user_id`, NULLABLE | Current physical holder |
| `origin_telemetry_id` | UUID | FOREIGN KEY → `environmental_telemetry.log_id`, NULLABLE | Linked telemetry source |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

**Indexes:**
- `idx_batch_status` on `status` — filter by lifecycle state
- `idx_batch_farmer` on `farmer_id` — fast farmer-scoped queries

---

## 4. CORE API ENDPOINT REGISTRY (DJANGO REST)

All endpoints (except auth) require a valid JSON Web Token (JWT) provided in the
`Authorization: Bearer <token>` request header.

### 4.1 Authentication Endpoints (`/api/v1/auth/`)

| Method | Endpoint | Description | Auth Required | Role |
|---|---|---|---|---|
| `POST` | `/register/` | Create new user account | ✗ | Any |
| `POST` | `/login/` | Obtain JWT access + refresh token pair | ✗ | Any |
| `POST` | `/token/refresh/` | Rotate refresh token, get new access token | ✗ | Any |
| `POST` | `/logout/` | Blacklist refresh token in Redis | ✓ | Any |
| `GET` | `/profile/` | Get current authenticated user's profile | ✓ | Any |

**Registration Payload:**
```json
{
  "email": "farmer@example.com",
  "password": "SecurePass123!",
  "full_name": "Kwame Asante",
  "role": "FARMER"
}
```

**Login Response:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "farmer@example.com",
    "role": "FARMER"
  }
}
```

### 4.2 Telemetry Endpoints (`/api/v1/telemetry/`)

| Method | Endpoint | Description | Auth Required | Role |
|---|---|---|---|---|
| `POST` | `/submit/` | Ingest new telemetry record | ✓ | FARMER |
| `GET` | `/history/?farmer_id=<uuid>` | Query paginated telemetry history | ✓ | FARMER, ADMIN |
| `GET` | `/latest/?farmer_id=<uuid>` | Get most recent telemetry entry | ✓ | FARMER, ADMIN |

**Telemetry Submission Payload:**
```json
{
  "temperature": 28.50,
  "soil_moisture": 64.20,
  "soil_ph": 6.80
}
```

**Telemetry Submission Response (201 Created):**
```json
{
  "log_id": "a1b2c3d4-...",
  "recorded_at": "2026-06-21T18:30:00Z",
  "payload_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "temperature_celsius": 28.50,
  "soil_moisture_percentage": 64.20,
  "soil_ph": 6.80
}
```

### 4.3 Analytics Endpoints (`/api/v1/analytics/`)

| Method | Endpoint | Description | Auth Required | Role |
|---|---|---|---|---|
| `GET` | `/predict/?farmer_id=<uuid>` | Run yield prediction (cached in Redis for 10 min) | ✓ | FARMER, ADMIN |
| `GET` | `/summary/?farmer_id=<uuid>` | Historical averages and trends | ✓ | FARMER, ADMIN |

**Yield Prediction Response:**
```json
{
  "confidence_score": 0.91,
  "predicted_yield_metric_tons": 4.25,
  "historical_variance_index": 0.04,
  "data_points_analyzed": 48,
  "recommendation": "Conditions are favorable. Maintain current soil moisture levels."
}
```

### 4.4 Ledger Endpoints (`/api/v1/ledger/`)

| Method | Endpoint | Description | Auth Required | Role |
|---|---|---|---|---|
| `POST` | `/batch/prepare/` | Create local batch record (status=PENDING), return hash for wallet signing | ✓ | FARMER |
| `PATCH` | `/batch/<uuid>/confirm/` | Attach `sui_object_id` + `sui_tx_digest` after successful wallet signing | ✓ | FARMER |
| `PATCH` | `/batch/<uuid>/transfer/` | Update `current_custodian` after on-chain custody transfer | ✓ | LOGISTICS |
| `GET` | `/batch/<uuid>/` | Get single batch with full details and on-chain status | ✓ | Any |
| `GET` | `/batches/` | List all batches (filterable by `status`, `farmer_id`, `custodian_id`) | ✓ | Any |
| `GET` | `/batch/<uuid>/verify/` | Re-hash verification: compare DB hash vs on-chain hash | ✓ | ADMIN |

**Batch Prepare Payload:**
```json
{
  "crop_type": "Maize",
  "weight_kg": 500.00,
  "origin_telemetry_id": "a1b2c3d4-..."
}
```

**Batch Prepare Response (201 Created):**
```json
{
  "batch_id": "f5e6d7c8-...",
  "status": "PENDING",
  "data_integrity_hash": "e3b0c44298fc...",
  "message": "Sign this hash with your Sui wallet to mint the batch on-chain."
}
```

**Batch Confirm Payload:**
```json
{
  "sui_object_id": "0xabc123...",
  "sui_tx_digest": "0xdef456..."
}
```

### 4.5 Admin Endpoints (`/api/v1/admin/`)

| Method | Endpoint | Description | Auth Required | Role |
|---|---|---|---|---|
| `GET` | `/users/` | List all users with roles and status | ✓ | ADMIN |
| `GET` | `/health/` | System health check (DB connectivity, Redis ping, Celery status) | ✓ | ADMIN |
| `GET` | `/audit-log/` | Recent system actions log | ✓ | ADMIN |

---

## 5. BLOCKCHAIN SMART CONTRACT DATA STRUCTURE (SUI MOVE)

The on-chain code implements a structural object model to track physical produce
batches as independent data elements on the Sui network.

### 5.1 Contract Module: `terranode::agri_ledger`

```rust
module terranode::agri_ledger {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::string::String;
    use sui::event;

    // ══════════════════════════════════════════
    //  OBJECTS
    // ══════════════════════════════════════════

    /// Programmable Object representing a verifiable crop batch in transit.
    /// Each batch is a unique on-chain asset with ownership semantics.
    struct ProduceBatch has key, store {
        id: UID,
        crop_type: String,
        weight_kg: u64,
        origin_farmer_address: address,
        current_custodian_address: address,
        data_integrity_hash: vector<u8>,  // SHA-256 bytes from backend
    }

    // ══════════════════════════════════════════
    //  EVENTS (captured by frontend after tx)
    // ══════════════════════════════════════════

    struct BatchMinted has copy, drop {
        batch_id: address,
        farmer: address,
        crop_type: String,
    }

    struct CustodyTransferred has copy, drop {
        batch_id: address,
        from: address,
        to: address,
    }

    // ══════════════════════════════════════════
    //  ENTRY FUNCTIONS
    // ══════════════════════════════════════════

    /// Executed by authenticated farmers to mint a new digital asset
    /// tracking a physical harvest. The integrity_hash is the SHA-256
    /// generated by the Django backend from the telemetry record.
    public entry fun mint_batch(
        crop_type: String,
        weight_kg: u64,
        integrity_hash: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let batch = ProduceBatch {
            id: object::new(ctx),
            crop_type,
            weight_kg,
            origin_farmer_address: sender,
            current_custodian_address: sender,
            data_integrity_hash: integrity_hash,
        };

        event::emit(BatchMinted {
            batch_id: object::uid_to_address(&batch.id),
            farmer: sender,
            crop_type: batch.crop_type,
        });

        transfer::public_transfer(batch, sender);
    }

    /// Transfers custody of a batch from the current custodian to a
    /// new custodian (e.g., from Farmer to Logistics Handler).
    /// Only the current custodian can execute this function.
    public entry fun transfer_custody(
        batch: &mut ProduceBatch,
        new_custodian: address,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(batch.current_custodian_address == sender, 0);

        event::emit(CustodyTransferred {
            batch_id: object::uid_to_address(&batch.id),
            from: sender,
            to: new_custodian,
        });

        batch.current_custodian_address = new_custodian;
    }

    // ══════════════════════════════════════════
    //  READ FUNCTIONS
    // ══════════════════════════════════════════

    public fun get_integrity_hash(batch: &ProduceBatch): &vector<u8> {
        &batch.data_integrity_hash
    }

    public fun get_custodian(batch: &ProduceBatch): address {
        batch.current_custodian_address
    }
}
```

### 5.2 Contract Deployment (Sui Testnet)

```bash
# 1. Install Sui CLI
suiup install sui@testnet

# 2. Initialize Move project
cd contracts/
sui move new terranode

# 3. Build and test
sui move build
sui move test

# 4. Switch to testnet and fund wallet
sui client switch --env testnet
# Get test tokens: https://faucet.sui.io

# 5. Deploy
sui client publish --gas-budget 10000000

# 6. Save the Package ID for frontend configuration
export PACKAGE_ID=<published_package_id>
```

---

## 6. SYSTEM DATA FLOW AND INTEGRATION STEPS

To maintain perfect data parity across the system, any new harvest action must strictly
execute along the following linear pipeline:

### Step 1: Telemetry Validation
The Farmer records field properties (temperature, soil moisture, pH) into the React
frontend interface via the `TelemetryForm` component.

### Step 2: Hash Generation
The React client passes raw metrics to the Django backend via `POST /api/v1/telemetry/submit/`.
Django validates the input, commits the metrics to PostgreSQL inside an atomic transaction,
and computes a SHA-256 hash from the canonical record (`farmer_id + timestamp + temp + moisture + pH`).
The hash is stored in the `payload_sha256` field and returned to the client.

### Step 3: Smart Contract Execution
When the Farmer initiates a batch mint, the React client calls `POST /api/v1/ledger/batch/prepare/`
to create a PENDING batch record. Django returns the `data_integrity_hash`. The React client
then opens the Sui wallet extension via `@mysten/dapp-kit`, requesting the user to sign a
transaction calling `mint_batch()` on the Sui network using that exact hash.

### Step 4: Database Synchronization
The Sui network mints the `ProduceBatch` object and emits a `BatchMinted` event containing
the new Sui Object ID. The React frontend captures this ID from the transaction response and
sends it back to Django via `PATCH /api/v1/ledger/batch/<uuid>/confirm/`, permanently anchoring
the local PostgreSQL row to the blockchain ledger.

### Step 5: Custody Chain
When the batch is physically transferred to a Logistics Handler, the `transfer_custody()`
function is called on-chain, and the Django backend is updated via
`PATCH /api/v1/ledger/batch/<uuid>/transfer/` to reflect the new custodian.

### Data Flow Diagram

```
 FARMER                    REACT FRONTEND               DJANGO BACKEND              SUI BLOCKCHAIN
   │                            │                            │                            │
   │  Enter telemetry data      │                            │                            │
   │ ─────────────────────────► │                            │                            │
   │                            │  POST /telemetry/submit/   │                            │
   │                            │ ─────────────────────────► │                            │
   │                            │                            │  Validate + SHA-256        │
   │                            │                            │  Save to PostgreSQL        │
   │                            │  201 { payload_sha256 }    │                            │
   │                            │ ◄───────────────────────── │                            │
   │                            │                            │                            │
   │  Click "Mint Batch"        │                            │                            │
   │ ─────────────────────────► │                            │                            │
   │                            │  POST /ledger/batch/       │                            │
   │                            │       prepare/             │                            │
   │                            │ ─────────────────────────► │                            │
   │                            │  201 { batch_id, hash }    │                            │
   │                            │ ◄───────────────────────── │                            │
   │                            │                            │                            │
   │  Sign wallet transaction   │                            │                            │
   │ ─────────────────────────► │  mint_batch(hash)          │                            │
   │                            │ ─────────────────────────────────────────────────────► │
   │                            │                            │           BatchMinted event │
   │                            │  { sui_object_id }         │                            │
   │                            │ ◄───────────────────────────────────────────────────── │
   │                            │                            │                            │
   │                            │  PATCH /ledger/batch/      │                            │
   │                            │        {id}/confirm/       │                            │
   │                            │ ─────────────────────────► │                            │
   │                            │                            │  Link sui_object_id        │
   │                            │                            │  Status → MINTED           │
   │                            │  200 OK                    │                            │
   │                            │ ◄───────────────────────── │                            │
   │                            │                            │                            │
```

---

## 7. SECURITY ARCHITECTURE

### 7.1 Password Security
- **Algorithm:** Argon2id (OWASP recommended, memory-hard, resistant to GPU attacks)
- **Django config:** `PASSWORD_HASHERS = ['django.contrib.auth.hashers.Argon2PasswordHasher']`
- **Dependency:** `argon2-cffi` Python package

### 7.2 API Security Matrix

| Threat | Protection | Implementation |
|---|---|---|
| Brute-force login | Rate limiting | 5 attempts/minute per IP (Redis counter with TTL) |
| API abuse | Throttling | 100 req/hour authenticated, 20 req/hour anonymous (DRF + Redis) |
| Token theft | Short expiry + rotation | 15-min access tokens; refresh tokens rotated on use |
| Token reuse after logout | Blacklisting | Redis SETEX with TTL matching token remaining lifespan |
| Cross-origin attacks | CORS | `django-cors-headers` — allowlist Vercel domain only |
| Man-in-the-middle | HTTPS + HSTS | `SECURE_SSL_REDIRECT`, 1-year HSTS header |
| Clickjacking | Frame denial | `X_FRAME_OPTIONS = "DENY"` |
| Content sniffing | Header enforcement | `SECURE_CONTENT_TYPE_NOSNIFF = True` |
| SQL injection | ORM parameterization | Django ORM default (no raw SQL) |
| XSS | Auto-escaping | React JSX + Django template engine |
| Data tampering | Cryptographic hashing | SHA-256 of telemetry records, verified against blockchain |

### 7.3 Production Security Settings
```python
# config/settings/production.py
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = "DENY"
```

---

## 8. REDIS INTEGRATION SPECIFICATION

### 8.1 What Is Redis?
Redis is an in-memory data structure store that operates as a cache and message broker.
It responds in microseconds (vs. milliseconds for PostgreSQL). We use it for operations
where speed matters more than persistence.

### 8.2 Provider: Upstash (Free Tier)
- **Commands:** 500,000/month (more than enough for a school project)
- **Storage:** 256MB
- **No credit card required**
- **Connection:** TLS-encrypted REST API or standard Redis protocol

### 8.3 Usage Map

| Use Case | Redis Key Pattern | TTL | Description |
|---|---|---|---|
| JWT Blacklist | `blacklist:{jti}` | Remaining token lifespan | Stores invalidated refresh token IDs |
| Rate Limit Counter | `throttle:{scope}:{ident}` | Window duration (e.g., 60s) | Counts requests per user/IP per time window |
| Analytics Cache | `analytics:predict:{farmer_id}` | 600 seconds (10 min) | Caches expensive yield prediction results |
| Celery Task Queue | `celery` (managed by Celery) | N/A | Message broker for async background tasks |

### 8.4 Django Configuration
```python
# config/settings/base.py
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    }
}

# Use Redis for DRF throttling
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/hour',
        'user': '100/hour',
        'login': '5/minute',
    }
}

# Celery configuration
CELERY_BROKER_URL = env("REDIS_URL")
CELERY_RESULT_BACKEND = env("REDIS_URL")
```