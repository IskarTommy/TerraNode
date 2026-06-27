# TERRANODE PROJECT ROADMAP

**Last Updated:** 2026-06-21
**Status:** Planning Complete → Ready for Phase 1

---

## OVERVIEW

This document tracks the execution progress of the TerraNode project across all phases.
It serves as the single source of truth for what has been done, what is in progress,
and what remains. Any AI or developer continuing this project should reference this file
to understand the current state.

---

## PHASE 1: PROJECT SKELETON & ENVIRONMENT SETUP

**Goal:** Get a running Django project with PostgreSQL, Redis, and React — all connected
and verified working locally before writing any business logic.

**Estimated Time:** ~1 session

### Backend Skeleton
- [x] Create `backend/` directory structure
- [x] Initialize Django project: `django-admin startproject config .`
- [x] Create split settings: `config/settings/base.py`, `development.py`, `production.py`
- [x] Create `Pipfile` with all dependencies (Django, DRF, JWT, Redis, Celery, etc.)
- [x] Run `pipenv install` to lock dependencies
- [x] Create `.env.example` template file
- [x] Create `.env` with local development values
- [x] Configure `django-environ` to read `.env` in settings
- [x] Configure PostgreSQL connection via `DATABASE_URL` (SQLite for dev)
- [x] Configure Redis connection via `REDIS_URL` (LocMemCache for dev)
- [x] Set up Celery app in `config/celery.py`
- [x] Create `core/` package with `exceptions.py`, `pagination.py`, `throttling.py`
- [x] Set up `config/urls.py` root URL configuration
- [x] Run `python manage.py migrate` (Django default tables)
- [x] Verify `python manage.py runserver` starts without errors
- [x] Verify cache works: `python manage.py shell` → `cache.set('test', 'ok'); print(cache.get('test'))`

### Frontend Skeleton
- [x] Create `frontend/` directory with Vite + React + TypeScript
- [x] Install core dependencies: `react-router-dom`, `axios`, `recharts`
- [x] Install Sui dependencies: `@mysten/dapp-kit`, `@mysten/sui`, `@tanstack/react-query`
- [x] Set up `src/styles/index.css` with CSS custom properties (design tokens)
- [x] Import Inter font from Google Fonts in `index.html`
- [x] Create `src/api/client.ts` (Axios instance with base URL)
- [x] Create `src/utils/constants.ts` with API URL and Sui config
- [x] Verify `npm run dev` starts without errors
- [x] Verify frontend loads at `http://localhost:5173`

### Smart Contract Skeleton
- [ ] Install Sui CLI: `suiup install sui@testnet`
- [ ] Create `contracts/` directory: `sui move new terranode`
- [ ] Write initial `agri_ledger.move` with structs and empty functions
- [ ] Verify `sui move build` compiles without errors

### Git Setup
- [ ] Initialize git repository: `git init`
- [ ] Create `.gitignore` (Python, Node, .env, __pycache__, node_modules, etc.)
- [ ] Initial commit with project skeleton

---

## PHASE 2: IDENTITY & ACCESS ENGINE

**Goal:** Complete user registration, login, JWT auth, and role-based permissions.
Users can sign up, log in, and be properly restricted to their role's endpoints.

**Estimated Time:** ~1-2 sessions

### Backend — Users Domain
- [x] Create Django app: `python manage.py startapp users` → move to `apps/users/`
- [x] Implement `CustomUserManager` in `apps/users/managers.py`
- [x] Implement `CustomUser` model in `apps/users/models.py`
  - [x] Fields: `id` (UUID), `email`, `full_name`, `role`, `sui_public_key`, `is_active`
  - [x] Set `AUTH_USER_MODEL = "users.CustomUser"` in settings
- [x] Set up Argon2 password hasher in settings
- [x] Create serializers in `apps/users/serializers.py`:
  - [x] `RegisterSerializer` — validates email uniqueness, password strength, role
  - [x] `CustomTokenObtainPairSerializer` — adds user info to JWT response
  - [x] `ProfileSerializer` — read-only user profile
- [x] Create views in `apps/users/views.py`:
  - [x] `RegisterView` — POST /auth/register/
  - [x] `LogoutView` — POST /auth/logout/ (blacklists refresh token in Redis)
  - [x] `ProfileView` — GET /auth/profile/
- [x] Create URL routes in `apps/users/urls.py`
- [x] Implement permission classes in `apps/users/permissions.py`:
  - [x] `IsFarmer`
  - [x] `IsLogistics`
  - [x] `IsAdmin`
  - [x] `IsFarmerOrAdmin`
- [x] Add login rate throttling with `LoginRateThrottle`
- [x] Configure JWT settings in `SIMPLE_JWT` (access=15min, refresh=7days, rotation=True)
- [x] Run migrations: `python manage.py makemigrations users && python manage.py migrate`
- [x] Register `CustomUser` in `apps/users/admin.py`
- [ ] Write tests in `apps/users/tests.py`:
  - [ ] Test registration (success + duplicate email + invalid role)
  - [ ] Test login (success + wrong password + rate limiting)
  - [ ] Test logout (token blacklisted)
  - [ ] Test permissions (farmer can't access admin endpoints, etc.)

### Frontend — Auth Pages
- [ ] Create `src/contexts/AuthContext.tsx`
  - [ ] State: `user`, `accessToken`, `isAuthenticated`
  - [ ] Functions: `login()`, `register()`, `logout()`, `refreshToken()`
- [ ] Create `src/hooks/useAuth.ts`
- [ ] Update `src/api/client.ts` with JWT interceptor (attach token + handle 401 refresh)
- [ ] Create `src/api/auth.ts` (login, register, logout, refresh API calls)
- [ ] Create `src/guards/RoleGuard.tsx`
- [ ] Build `src/components/Forms/LoginForm.tsx`
- [ ] Build `src/components/Forms/RegisterForm.tsx`
- [ ] Build `src/pages/LoginPage.tsx` (styled, responsive)
- [ ] Build `src/pages/RegisterPage.tsx` (styled, responsive)
- [ ] Set up routing in `src/App.tsx`
- [ ] Build `src/components/Layout/DashboardLayout.tsx` (placeholder)
- [ ] Test: Register → Login → See dashboard → Logout → Can't access dashboard

---

## PHASE 3: TELEMETRY INGESTION & ANALYTICS

**Goal:** Farmers can submit telemetry data, view history with charts, and see yield
predictions. Data integrity is guaranteed via SHA-256 hashing.

**Estimated Time:** ~2 sessions

### Backend — Telemetry Domain
- [x] Create Django app: `python manage.py startapp telemetry` → move to `apps/telemetry/`
- [x] Implement `EnvironmentalTelemetry` model in `apps/telemetry/models.py`
  - [x] Fields: `log_id`, `farmer_id`, `recorded_at`, `temperature_celsius`, `soil_moisture_percentage`, `soil_ph`, `payload_sha256`
  - [x] Indexes on `farmer_id` and `recorded_at`
- [x] Implement `generate_telemetry_hash()` in `apps/telemetry/services.py`
  - [x] Canonical JSON format → SHA-256 → hex digest
  - [x] Must be deterministic (same input → same hash, always)
- [x] Create serializers in `apps/telemetry/serializers.py`:
  - [x] `TelemetryInputSerializer` — validates temp/moisture/pH ranges (server-side timestamp)
  - [x] `TelemetryOutputSerializer` — includes `payload_sha256`
- [x] Create views in `apps/telemetry/views.py`:
  - [x] `TelemetrySubmitView` — POST with `transaction.atomic()`
  - [x] `TelemetryHistoryView` — GET with pagination
  - [x] `TelemetryLatestView` — GET single most recent record
- [x] Create URL routes in `apps/telemetry/urls.py`
- [x] Run migrations
- [ ] Write tests:
  - [ ] Test hash determinism (same input → same hash)
  - [ ] Test hash uniqueness (different input → different hash)
  - [ ] Test input validation (reject negative pH, temperature > 60, etc.)
  - [ ] Test atomic transaction (DB rollback on failure)
  - [ ] Test RBAC (only FARMER can submit)

### Backend — Analytics Domain
- [x] Create Django app: `python manage.py startapp analytics` → move to `apps/analytics/`
- [x] Implement `predict_yield()` in `apps/analytics/services.py`
  - [x] Fetch last 90 telemetry records
  - [x] Calculate weighted moving average
  - [x] Generate confidence score and recommendation
  - [x] Cache result in Redis (10-minute TTL)
- [x] Implement `get_summary()` in `apps/analytics/services.py`
  - [x] Calculate averages, min/max, trend direction
- [x] Create views: `PredictYieldView`, `SummaryView`
- [x] Create URL routes
- [ ] Write tests:
  - [ ] Test prediction with sufficient data
  - [ ] Test prediction with insufficient data (< 5 records)
  - [ ] Test Redis caching (second call returns cached result)

### Frontend — Telemetry & Analytics Pages
- [ ] Create `src/api/telemetry.ts` (submit, getHistory, getLatest)
- [ ] Create `src/api/analytics.ts` (predict, getSummary)
- [ ] Build `src/components/Forms/TelemetryForm.tsx`
  - [ ] Three numeric inputs with validation
  - [ ] Loading state on submit
  - [ ] Success/error toast notification
- [ ] Build `src/components/Charts/TelemetryChart.tsx`
  - [ ] Recharts `LineChart` with three series (temp, moisture, pH)
  - [ ] Gradient fill under lines
  - [ ] Date range selector
- [ ] Build `src/components/Charts/YieldPredictionChart.tsx`
  - [ ] Gauge or bar chart showing confidence score
  - [ ] Predicted yield metric tons display
- [ ] Build `src/components/Cards/StatsCard.tsx`
  - [ ] Number + label + trend indicator (up/down arrow)
  - [ ] Glassmorphism styling
- [ ] Build `src/pages/farmer/FarmerDashboard.tsx`
  - [ ] 4 StatsCards (temp, moisture, pH, predicted yield)
  - [ ] TelemetryChart (recent 30 days)
  - [ ] Recent batches list
- [ ] Build `src/pages/farmer/TelemetryPage.tsx`
  - [ ] TelemetryForm + TelemetryChart + history table

---

## PHASE 4: BLOCKCHAIN LEDGER INTEGRATION

**Goal:** Farmers can mint crop batches on the Sui blockchain. Logistics handlers can
transfer custody. Admins can verify data integrity against on-chain hashes.

**Estimated Time:** ~1-2 sessions

### Backend — Ledger Domain
- [x] Create Django app: `python manage.py startapp ledger` → move to `apps/ledger/`
- [x] Implement `ProduceBatch` model in `apps/ledger/models.py`
  - [x] Fields: `batch_id`, `farmer_id`, `crop_type`, `weight_kg`, `data_integrity_hash`, `status`, `sui_object_id`, `sui_tx_digest`, `current_custodian_id`, `origin_telemetry_id`
  - [x] Status choices: PENDING, MINTED, IN_TRANSIT, DELIVERED
- [x] Create serializers:
  - [x] `BatchPrepareSerializer`
  - [x] `BatchConfirmSerializer`
  - [x] `BatchTransferSerializer`
  - [x] `BatchOutputSerializer`
- [x] Create views:
  - [x] `BatchPrepareView` — creates PENDING batch, returns hash for signing
  - [x] `BatchConfirmView` — links `sui_object_id` and `sui_tx_digest`, status → MINTED
  - [x] `BatchTransferView` — updates custodian, status → IN_TRANSIT or DELIVERED
  - [x] `BatchDetailView` — GET single batch
  - [x] `BatchListView` — GET with filtering
  - [ ] `BatchVerifyView` — re-hash check (ADMIN only)
- [x] Implement `link_sui_object()` in `apps/ledger/services.py`
- [x] Implement `verify_integrity()` in `apps/ledger/services.py`
- [x] Create URL routes
- [x] Run migrations
- [ ] Write tests:
  - [ ] Test batch lifecycle (PENDING → MINTED → IN_TRANSIT → DELIVERED)
  - [ ] Test integrity verification (matching hash = True, tampered = False)
  - [ ] Test RBAC (only FARMER can prepare, only LOGISTICS can transfer)

### Smart Contract — Sui Move
- [ ] Complete `agri_ledger.move` with full logic:
  - [ ] `mint_batch()` — create ProduceBatch object, emit BatchMinted event
  - [ ] `transfer_custody()` — assert sender is current custodian, update, emit event
  - [ ] Read functions: `get_integrity_hash()`, `get_custodian()`
- [ ] Write Move unit tests
- [ ] Build: `sui move build`
- [ ] Test: `sui move test`
- [ ] Deploy to testnet: `sui client publish --gas-budget 10000000`
- [ ] Record Package ID in environment variables

### Frontend — Blockchain Pages
- [ ] Set up Sui dApp Kit providers in `src/main.tsx`
- [ ] Create `src/contexts/WalletContext.tsx`
- [ ] Create `src/hooks/useSuiWallet.ts`
- [ ] Create `src/api/ledger.ts`
- [ ] Build `src/components/Forms/MintBatchForm.tsx`
  - [ ] Crop type selector, weight input, telemetry record picker
  - [ ] "Connect Wallet" button (if not connected)
  - [ ] Hash preview before signing
  - [ ] Wallet signing flow with loading state
- [ ] Build `src/components/Cards/BatchCard.tsx`
  - [ ] Status badge (color-coded)
  - [ ] Crop type, weight, custodian info
  - [ ] Link to Sui Explorer for minted batches
- [ ] Build `src/pages/farmer/MintBatchPage.tsx`
- [ ] Build `src/pages/logistics/LogisticsDashboard.tsx`
- [ ] Build `src/pages/logistics/TransferPage.tsx`
- [ ] Build `src/pages/admin/AdminDashboard.tsx`
- [ ] Build `src/pages/admin/UsersPage.tsx`
- [ ] Build `src/pages/admin/AuditPage.tsx`

---

## PHASE 5: POLISH, DEPLOY & DEMO

**Goal:** Deploy everything to free hosting, run full end-to-end tests, and prepare
for the school presentation/demo.

**Estimated Time:** ~1 session

### Deployment
- [ ] Create Neon account → set up PostgreSQL database
- [ ] Create Upstash account → set up Redis instance
- [ ] Create Render account → deploy Django backend
  - [ ] Set all environment variables
  - [ ] Verify migrations ran successfully
  - [ ] Create admin superuser via Render shell
  - [ ] Test health endpoint: `GET /api/v1/admin/health/`
- [ ] Create Vercel account → deploy React frontend
  - [ ] Set environment variables (API URL, Sui Package ID)
  - [ ] Verify login page loads
- [ ] Set up UptimeRobot → ping Render every 14 minutes

### End-to-End Testing
- [ ] Register a FARMER account
- [ ] Register a LOGISTICS account
- [ ] Register an ADMIN account
- [ ] Login as FARMER:
  - [ ] Submit 5+ telemetry readings
  - [ ] View telemetry history and charts
  - [ ] View yield prediction
  - [ ] Prepare a batch (create PENDING)
  - [ ] Connect Sui wallet
  - [ ] Sign mint transaction → batch becomes MINTED
- [ ] Login as LOGISTICS:
  - [ ] View batches
  - [ ] Transfer custody of a batch
- [ ] Login as ADMIN:
  - [ ] View all users
  - [ ] View system health
  - [ ] Run integrity verification on a batch

### Seed Data (Optional — For Demo)
- [ ] Create management command: `python manage.py seed_demo_data`
  - [ ] Creates 3 demo users (farmer, logistics, admin)
  - [ ] Creates 60 telemetry records (30 days × 2 per day) with realistic values
  - [ ] Creates 5 produce batches in various states
  - [ ] Ensures charts and dashboards look populated

### Documentation
- [ ] Update README.md with:
  - [ ] Project description
  - [ ] Architecture diagram
  - [ ] Local setup instructions
  - [ ] Live demo links
  - [ ] Technology stack table

---

## PROGRESS LOG

Use this section to record progress as you work through the phases.
Each entry should include the date, what was done, and any issues encountered.

```
Date       | Phase | What Was Done                              | Issues/Notes
-----------+-------+--------------------------------------------+---------------------------
2026-06-21 | PLAN  | Created all project documentation files    | Ready to begin Phase 1
           |       | (Spec, Backend, Frontend, Deploy, Roadmap) |
2026-06-27 | 1     | Django project skeleton initialized        | Phase 1 complete
           |       | Split settings (base/dev/prod) configured  |
           |       | Pipfile dependencies locked                |
           |       | CustomUser model with UUID, role, SUI key  |
           |       | Argon2id password hashing                  |
           |       | JWT auth with refresh rotation + blacklist |
           |       | RBAC permissions (Farmer/Logistics/Admin)  |
           |       | Core infra (exceptions, pagination, throttle)
           |       | Telemetry domain (models, hash, views)     |
           |       | Ledger domain (models, batch lifecycle)    |
           |       | Analytics domain (prediction + caching)    |
           |       | Vite + React + TS frontend scaffolded      |
           |       | All deps installed (React Router, Axios,   |
           |       | Recharts, Sui dApp Kit, TanStack Query)    |
           |       | Design system CSS tokens configured        |
           |       | SQLite DB migrated, server runs on :8000   |
           |       | Frontend runs on :5173 with HMR            |
```

---

## FILE REFERENCE MAP

For any AI or developer continuing this project, here are the key documentation files
and what they contain:

| File | Contents |
|---|---|
| `TECHNICAL SYSTEM SPECIFICATION.md` | Full system architecture, RBAC matrix, database schema, API endpoints, smart contract code, data flow, security architecture, Redis specification |
| `TERRANODE BACKEND ENGINE.md` | Django project structure (DDD), settings architecture, domain deep dives (users, telemetry, ledger, analytics), code examples, dependency manifest |
| `TERRANODE FRONTEND ENGINE.md` | React project structure, routing config, component hierarchy, Sui wallet integration, page specifications, design system, TypeScript types |
| `DEPLOYMENT & INFRASTRUCTURE.md` | Hosting providers (Render, Neon, Upstash, Vercel), local dev setup steps, production deployment steps, environment variables, troubleshooting |
| `PROJECT ROADMAP.md` | This file — phased task checklist with progress tracking |

---

## IMPORTANT CONTEXT FOR AI ASSISTANTS

If you are an AI picking up this project mid-way:

1. **Read ALL five .md files** before making changes. They are the source of truth.
2. **Check the PROGRESS LOG** above to see what phase we're on.
3. **Check the task checkboxes** in the current phase to see what's done.
4. **Follow the Domain-Driven Design** — each domain is an isolated Django app in `apps/`.
5. **Never skip tests** — this is a school project and correctness matters.
6. **Security is not optional** — Argon2, JWT rotation, Redis blacklisting, rate limiting are all required.
7. **Free hosting constraints** — Render sleeps after 15 min, Neon scales to zero, Upstash has 500K cmd/month limit. Design accordingly.
8. **The blockchain layer uses Sui Testnet** — no real money, free test tokens from faucet.
9. **The frontend uses a dark theme** with emerald green accents — see the design tokens in the Frontend Engine doc.
