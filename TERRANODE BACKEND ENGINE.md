# TERRANODE BACKEND ENGINE: ARCHITECTURAL DESIGN

**Framework:** Django 5.x + Django REST Framework
**Database:** PostgreSQL 16 (Neon serverless)
**Cache/Broker:** Redis (Upstash)
**Task Queue:** Celery
**Auth:** djangorestframework-simplejwt + Argon2id
**Package Manager:** Pipenv

---

## 1. THE DOMAIN-DRIVEN DESIGN (DDD) STRATEGY

Rather than dumping code into standard Django folders, we use a Domain-Driven approach.
This ensures that if the "Telemetry" logic ever needs to be swapped or upgraded, it doesn't
break the "Ledger" or "User" logic. Each domain is a self-contained Django app with its own
models, serializers, services, views, and tests.

### 1.1 The Domain Structure

```
backend/
├── Pipfile                        # Python dependencies
├── Pipfile.lock
├── manage.py
├── .env.example                   # Environment variable template
│
├── config/                        # Django project configuration
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py               # Shared settings (installed apps, middleware, DRF, JWT, Redis)
│   │   ├── development.py        # DEBUG=True, local DB, CORS allow-all
│   │   └── production.py         # DEBUG=False, Neon DB, security headers, CORS allowlist
│   ├── urls.py                   # Root URL router → domain URL files
│   ├── celery.py                 # Celery app initialization
│   ├── wsgi.py                   # WSGI entrypoint (Gunicorn in production)
│   └── asgi.py                   # ASGI entrypoint (future WebSocket support)
│
├── apps/                          # Domain-Driven bounded contexts
│   ├── __init__.py
│   │
│   ├── users/                    # DOMAIN: Identity & RBAC
│   │   ├── __init__.py
│   │   ├── models.py            # CustomUser model (extends AbstractUser)
│   │   ├── serializers.py       # RegisterSerializer, LoginSerializer, ProfileSerializer
│   │   ├── views.py             # RegisterView, LoginView, LogoutView, ProfileView
│   │   ├── permissions.py       # IsFarmer, IsLogistics, IsAdmin custom permission classes
│   │   ├── urls.py              # /api/v1/auth/* routes
│   │   ├── admin.py             # Django admin registration
│   │   ├── managers.py          # CustomUserManager (email-based auth instead of username)
│   │   └── tests.py             # Auth flow tests, permission tests
│   │
│   ├── telemetry/               # DOMAIN: High-Frequency Data Ingestion
│   │   ├── __init__.py
│   │   ├── models.py            # EnvironmentalTelemetry model
│   │   ├── serializers.py       # TelemetryInputSerializer, TelemetryOutputSerializer
│   │   ├── services.py          # generate_telemetry_hash(), telemetry business logic
│   │   ├── views.py             # TelemetrySubmitView, TelemetryHistoryView, TelemetryLatestView
│   │   ├── urls.py              # /api/v1/telemetry/* routes
│   │   ├── admin.py
│   │   └── tests.py             # Hash determinism tests, validation tests
│   │
│   ├── ledger/                  # DOMAIN: Blockchain Sync & Asset Tracking
│   │   ├── __init__.py
│   │   ├── models.py            # ProduceBatch model (with sui_object_id, status tracking)
│   │   ├── serializers.py       # BatchPrepareSerializer, BatchConfirmSerializer, etc.
│   │   ├── services.py          # link_sui_object(), verify_integrity(), re-hash check
│   │   ├── views.py             # BatchPrepareView, BatchConfirmView, BatchTransferView, etc.
│   │   ├── urls.py              # /api/v1/ledger/* routes
│   │   ├── admin.py
│   │   └── tests.py             # Batch lifecycle tests, integrity verification tests
│   │
│   └── analytics/               # DOMAIN: Yield Prediction & Insights
│       ├── __init__.py
│       ├── services.py          # Prediction engine (weighted moving average / linear regression)
│       ├── views.py             # PredictYieldView, SummaryView
│       ├── urls.py              # /api/v1/analytics/* routes
│       └── tests.py             # Prediction accuracy tests
│
└── core/                         # Cross-cutting concerns (shared by all domains)
    ├── __init__.py
    ├── throttling.py            # Custom Redis-backed throttle classes
    ├── middleware.py            # Request logging, security header enforcement
    ├── exceptions.py            # Unified error response format (DRF exception handler)
    └── pagination.py            # Standard pagination configuration
```

### 1.2 Domain Responsibilities

| Domain | Responsibility | Key Principle |
|---|---|---|
| **users** | Identity verification, RBAC enforcement, JWT lifecycle | "Who are you and what can you do?" |
| **telemetry** | Sensor data ingestion, validation, cryptographic sealing | "Record the truth and prove it" |
| **ledger** | Blockchain state tracking, on-chain/off-chain synchronization | "Track the asset, verify the chain" |
| **analytics** | Statistical prediction, trend analysis, cached insights | "Predict the future from the past" |
| **core** | Throttling, error handling, pagination, middleware | "Shared infrastructure for all domains" |

---

## 2. DEPENDENCY MANIFEST (Pipfile)

```toml
[packages]
# Core Framework
django = "~=5.1"
djangorestframework = "~=3.15"
django-cors-headers = "~=4.4"
django-environ = "~=0.11"

# Authentication
djangorestframework-simplejwt = "~=5.3"
argon2-cffi = "~=23.1"               # Argon2id password hashing

# Database
psycopg = {extras = ["binary"], version = "~=3.2"}  # PostgreSQL adapter (psycopg3)
dj-database-url = "~=2.2"            # Parse DATABASE_URL from environment

# Redis & Caching
django-redis = "~=5.4"               # Django cache backend for Redis
redis = "~=5.0"                       # Python Redis client

# Async Task Queue
celery = "~=5.4"                      # Distributed task queue
django-celery-beat = "~=2.6"          # Periodic task scheduling (optional)

# Production Server
gunicorn = "~=22.0"                   # WSGI HTTP server
whitenoise = "~=6.7"                  # Static file serving

# Utilities
python-dotenv = "~=1.0"

[dev-packages]
pytest = "*"
pytest-django = "*"
factory-boy = "*"                     # Test data factories
faker = "*"                           # Realistic fake data generation

[requires]
python_version = "3.12"
```

---

## 3. ENVIRONMENT VARIABLES (.env.example)

```bash
# ─── Django ───────────────────────────────────────────
DJANGO_SECRET_KEY=your-secret-key-change-me-in-production
DJANGO_DEBUG=True
DJANGO_SETTINGS_MODULE=config.settings.development
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# ─── Database (PostgreSQL) ───────────────────────────
DATABASE_URL=postgres://user:password@localhost:5432/terranode

# ─── Redis ────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ─── JWT ──────────────────────────────────────────────
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# ─── CORS ─────────────────────────────────────────────
CORS_ALLOWED_ORIGINS=http://localhost:5173

# ─── Sui Blockchain (for reference/logging) ──────────
SUI_NETWORK=testnet
SUI_PACKAGE_ID=0x_your_deployed_package_id
```

---

## 4. SETTINGS ARCHITECTURE

### 4.1 Base Settings (`config/settings/base.py`)

This file contains all settings shared between development and production:

```python
import environ
from pathlib import Path
from datetime import timedelta

env = environ.Env()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ─── Core ─────────────────────────────────────────────
SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])

# ─── Applications ────────────────────────────────────
INSTALLED_APPS = [
    # Django built-in
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "corsheaders",
    "django_celery_beat",
    # Project domains
    "apps.users",
    "apps.telemetry",
    "apps.ledger",
    "apps.analytics",
]

# ─── Middleware ───────────────────────────────────────
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",       # Static files
    "corsheaders.middleware.CorsMiddleware",            # CORS (must be before CommonMiddleware)
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ─── Custom User Model ───────────────────────────────
AUTH_USER_MODEL = "users.CustomUser"

# ─── Password Hashing ────────────────────────────────
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",  # Primary (Argon2id)
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",  # Fallback
]

# ─── Database ─────────────────────────────────────────
DATABASES = {
    "default": env.db("DATABASE_URL"),
}

# ─── Redis Cache ──────────────────────────────────────
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    }
}

# ─── Django REST Framework ────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "20/hour",
        "user": "100/hour",
        "login": "5/minute",
    },
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
}

# ─── Simple JWT ───────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=15)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=env.int("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7)
    ),
    "ROTATE_REFRESH_TOKENS": True,         # Issue new refresh on every use
    "BLACKLIST_AFTER_ROTATION": True,       # Old refresh tokens are blacklisted
    "AUTH_HEADER_TYPES": ("Bearer",),
    "TOKEN_OBTAIN_SERIALIZER": "apps.users.serializers.CustomTokenObtainPairSerializer",
}

# ─── CORS ─────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])

# ─── Celery ───────────────────────────────────────────
CELERY_BROKER_URL = env("REDIS_URL")
CELERY_RESULT_BACKEND = env("REDIS_URL")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"

# ─── Static Files ─────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# ─── URL Configuration ───────────────────────────────
ROOT_URLCONF = "config.urls"
```

### 4.2 Development Settings (`config/settings/development.py`)
```python
from .base import *

DEBUG = True
ALLOWED_HOSTS = ["*"]
CORS_ALLOW_ALL_ORIGINS = True  # Allow all origins in development
```

### 4.3 Production Settings (`config/settings/production.py`)
```python
from .base import *

DEBUG = False

# ─── Security Headers ────────────────────────────────
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

## 5. ROOT URL CONFIGURATION

```python
# config/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/telemetry/", include("apps.telemetry.urls")),
    path("api/v1/ledger/", include("apps.ledger.urls")),
    path("api/v1/analytics/", include("apps.analytics.urls")),
]
```

---

## 6. DOMAIN DEEP DIVES

### 6.1 Users Domain — Identity & Access Engine

#### CustomUser Model
```python
# apps/users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        FARMER = "FARMER", "Farmer"
        LOGISTICS = "LOGISTICS", "Logistics Handler"
        ADMIN = "ADMIN", "System Administrator"

    # Remove username, use email as primary identifier
    username = None
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=200)
    role = models.CharField(max_length=20, choices=Role.choices)
    sui_public_key = models.CharField(max_length=66, blank=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "role"]

    objects = CustomUserManager()  # Defined in managers.py

    def __str__(self):
        return f"{self.full_name} ({self.role})"
```

#### Permission Classes
```python
# apps/users/permissions.py
from rest_framework.permissions import BasePermission

class IsFarmer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "FARMER"

class IsLogistics(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "LOGISTICS"

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "ADMIN"

class IsFarmerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("FARMER", "ADMIN")
```

---

### 6.2 Telemetry Domain — The Ingestion Engine

This is the most critical logic for the backend. To ensure data integrity, we treat data
ingestion as a Service-Call process with atomic database transactions.

#### The Logic Pipeline

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────────┐     ┌────────────────┐
│  1. Request  │────►│  2. Validation   │────►│  3. Hash Service   │────►│ 4. Atomic Save │
│  Arrival     │     │  (Serializer)    │     │  (SHA-256)         │     │ (PostgreSQL)   │
│              │     │                  │     │                    │     │                │
│  Raw JSON    │     │  Type checking   │     │  Canonical JSON    │     │  Transaction   │
│  from client │     │  Range checking  │     │  → SHA-256 digest  │     │  Commit/Rollback│
└──────────────┘     └──────────────────┘     └────────────────────┘     └────────────────┘
```

1. **Request Arrival:** The `TelemetrySubmitView` receives raw sensor data (temperature, moisture, pH).
2. **Validation:** The `TelemetryInputSerializer` checks data types, ranges, and formats.
3. **Hashing Service:** `generate_telemetry_hash()` creates a deterministic SHA-256 fingerprint
   from the canonical representation of the data. This is the most important part of the
   system's integrity guarantee.
4. **Database Atomicity:** The record is saved to PostgreSQL inside `transaction.atomic()`.
   If this step fails, the entire transaction is rolled back — no "half-finished" data.

#### Hash Generation Service
```python
# apps/telemetry/services.py
import hashlib
import json

def generate_telemetry_hash(farmer_id, recorded_at, temperature, soil_moisture, soil_ph):
    """
    Generate a deterministic SHA-256 hash from telemetry data.

    The canonical format ensures that the same input always produces the same hash,
    regardless of JSON key ordering or floating-point formatting.
    """
    canonical_data = json.dumps({
        "farmer_id": str(farmer_id),
        "recorded_at": recorded_at.isoformat(),
        "temperature_celsius": f"{temperature:.2f}",
        "soil_moisture_percentage": f"{soil_moisture:.2f}",
        "soil_ph": f"{soil_ph:.2f}",
    }, sort_keys=True, separators=(",", ":"))

    return hashlib.sha256(canonical_data.encode("utf-8")).hexdigest()
```

#### Why This Hash Matters
- The hash is stored in the database (`payload_sha256` field)
- The same hash is sent to the Sui blockchain when minting a batch
- Later, the `verify_integrity()` service can re-compute the hash and compare it
  against the on-chain value — if they don't match, the data was tampered with

---

### 6.3 Ledger Domain — Blockchain Interface

The Ledger domain does not perform heavy computation. Its sole purpose is to act as a
"Source of Truth" for the asset's current owner and the integrity hash.

#### Batch Lifecycle State Machine

```
                    ┌──────────┐
    batch/prepare/  │          │  batch/{id}/confirm/
   ────────────────►│ PENDING  │─────────────────────►┌──────────┐
                    │          │  (sui_object_id set)  │          │
                    └──────────┘                       │  MINTED  │
                         │                             │          │
                         │ (on-chain mint fails,       └────┬─────┘
                         │  stays PENDING until retry)      │
                         ▼                                  │ batch/{id}/transfer/
                    User retries from                       │
                    React frontend                          ▼
                                                      ┌──────────┐
                                                      │IN_TRANSIT│
                                                      │          │
                                                      └────┬─────┘
                                                           │ batch/{id}/transfer/
                                                           │ (final delivery)
                                                           ▼
                                                      ┌──────────┐
                                                      │DELIVERED │
                                                      │          │
                                                      └──────────┘
```

#### Why This Design Is Superior

- **Decoupled Sync:** The backend does NOT try to "force" the blockchain to update.
  Instead, it tracks the *attempt* to update. If a transaction on the Sui network fails,
  the backend stays in a "PENDING" state until the user retries the transaction from the
  React frontend. This prevents backend crashes from flaky blockchain network calls.

- **Cryptographic Verification:** Every time an asset is queried, the ledger service can
  perform a "Re-Hash Check." It takes the current database record, hashes it again,
  and compares it to the `data_integrity_hash` stored on the Sui blockchain. If they
  don't match, the system alerts the admin of potential tampering.

#### Integrity Verification Service
```python
# apps/ledger/services.py
from apps.telemetry.services import generate_telemetry_hash

def verify_integrity(batch):
    """
    Re-compute the hash from the linked telemetry record and compare
    it against the hash stored on the blockchain.

    Returns True if the data has not been tampered with.
    """
    telemetry = batch.origin_telemetry
    if not telemetry:
        return None  # No linked telemetry

    recomputed_hash = generate_telemetry_hash(
        farmer_id=telemetry.farmer_id,
        recorded_at=telemetry.recorded_at,
        temperature=telemetry.temperature_celsius,
        soil_moisture=telemetry.soil_moisture_percentage,
        soil_ph=telemetry.soil_ph,
    )

    return recomputed_hash == batch.data_integrity_hash
```

---

### 6.4 Analytics Domain — Yield Prediction Engine

The analytics service processes historical telemetry data to predict future crop yields
using a weighted moving average with confidence scoring.

#### Prediction Logic
```python
# apps/analytics/services.py
from django.core.cache import cache
from apps.telemetry.models import EnvironmentalTelemetry

CACHE_TTL = 600  # 10 minutes

def predict_yield(farmer_id):
    """
    Predict crop yield based on historical telemetry data.
    Results are cached in Redis for 10 minutes.
    """
    cache_key = f"analytics:predict:{farmer_id}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    # Fetch last 30 days of telemetry
    records = EnvironmentalTelemetry.objects.filter(
        farmer_id=farmer_id
    ).order_by("-recorded_at")[:90]  # Up to 90 records

    if len(records) < 5:
        return {"error": "Insufficient data points for prediction"}

    # Weighted moving average calculation
    # (More recent readings have higher weight)
    # ... computation logic ...

    result = {
        "confidence_score": confidence,
        "predicted_yield_metric_tons": predicted_yield,
        "historical_variance_index": variance,
        "data_points_analyzed": len(records),
        "recommendation": generate_recommendation(avg_temp, avg_moisture, avg_ph),
    }

    cache.set(cache_key, result, CACHE_TTL)
    return result
```

---

## 7. CROSS-CUTTING CONCERNS (core/)

### 7.1 Custom Exception Handler
```python
# core/exceptions.py
from rest_framework.views import exception_handler

def custom_exception_handler(exc, context):
    """
    Wraps all DRF error responses in a consistent format:
    {
        "success": false,
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "...",
            "details": { ... }
        }
    }
    """
    response = exception_handler(exc, context)
    if response is not None:
        response.data = {
            "success": False,
            "error": {
                "code": response.status_code,
                "message": str(exc),
                "details": response.data,
            }
        }
    return response
```

### 7.2 Standard Pagination
```python
# core/pagination.py
from rest_framework.pagination import PageNumberPagination

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
```

### 7.3 Redis-Backed Login Throttle
```python
# core/throttling.py
from rest_framework.throttling import AnonRateThrottle

class LoginRateThrottle(AnonRateThrottle):
    scope = "login"
    rate = "5/minute"
```

---

## 8. PROJECT COMPONENT CHECKLIST (PHASE 1-2)

### Phase 1: Project Skeleton Initialization
- [ ] Create Django project with `django-admin startproject config .`
- [ ] Set up split settings (base/development/production)
- [ ] Create Pipfile with all dependencies
- [ ] Configure `.env` with `django-environ`
- [ ] Configure PostgreSQL connection (local dev → Neon prod)
- [ ] Configure Redis connection (local → Upstash prod)
- [ ] Set up Celery with Redis broker
- [ ] Create `core/` package (exceptions, pagination, throttling)
- [ ] Verify `manage.py runserver` starts successfully

### Phase 2: Identity & Access Engine
- [ ] Create `apps/users/` Django app
- [ ] Implement `CustomUser` model with `role` and `sui_public_key`
- [ ] Implement `CustomUserManager` for email-based auth
- [ ] Set up Argon2 password hasher
- [ ] Create `RegisterSerializer`, `LoginSerializer`, `ProfileSerializer`
- [ ] Create `RegisterView`, `LoginView`, `LogoutView`, `ProfileView`
- [ ] Implement JWT with refresh token rotation
- [ ] Implement Redis-backed token blacklisting on logout
- [ ] Create `IsFarmer`, `IsLogistics`, `IsAdmin` permission classes
- [ ] Add login rate throttling (5/minute)
- [ ] Write unit tests for auth flow
- [ ] Write unit tests for permission enforcement

### Phase 3: Telemetry Ingestion Logic
- [ ] Create `apps/telemetry/` Django app
- [ ] Implement `EnvironmentalTelemetry` model
- [ ] Implement `generate_telemetry_hash()` service
- [ ] Build `TelemetrySubmitView` with atomic transactions
- [ ] Build `TelemetryHistoryView` with pagination
- [ ] Build `TelemetryLatestView`
- [ ] Write unit tests for hash determinism
- [ ] Write unit tests for input validation

### Phase 4: Blockchain Sync Tracking
- [ ] Create `apps/ledger/` Django app
- [ ] Define `ProduceBatch` model with on-chain linking
- [ ] Build `BatchPrepareView` (creates PENDING batch)
- [ ] Build `BatchConfirmView` (links `sui_object_id`)
- [ ] Build `BatchTransferView` (updates custodian)
- [ ] Build `verify_integrity()` service
- [ ] Write unit tests for batch lifecycle
- [ ] Write unit tests for integrity verification

### Phase 5: Analytics Engine
- [ ] Create `apps/analytics/` Django app
- [ ] Implement `predict_yield()` service with Redis caching
- [ ] Implement `get_summary()` service
- [ ] Build `PredictYieldView` and `SummaryView`
- [ ] Write unit tests for prediction logic
