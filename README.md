# TerraNode — Decentralized Agricultural Provenance & Yield Intelligence

TerraNode is a secure, analytics-driven agricultural data management platform. It combines IoT environmental sensor telemetry encryption, rule-based Weighted Moving Average (WMA) yield forecasting, and decentralized produce traceability on the **Sui blockchain**.

---

## 🏗️ System Architecture

* **Backend Engine:** Django 5.2 & Django REST Framework (Python 3.11/3.12, SimpleJWT, AES-256-GCM encryption, Argon2id, SQLite in dev / PostgreSQL in prod).
* **Frontend Web App:** React 19, TypeScript, Vite, Tailwind CSS, Recharts, `@mysten/dapp-kit` (Sui blockchain wallet integration).
* **Smart Contracts:** Sui Move (`agri_ledger.move`) on Sui Testnet for decentralized produce batch minting and custody transfers.

---

## ⚡ Quickstart Setup

### 1. Prerequisites
* **Git**
* **Python 3.11 or 3.12** & **Pipenv** (`pip install pipenv`)
* **Node.js (v18 or v20+)** & **pnpm** (`npm install -g pnpm`)
* *(Optional)* **Sui CLI** (for compiling and publishing Move contracts to Testnet)

---

### 2. Backend Setup (Django API)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Configure environment variables in `backend/.env`:
   ```env
   DJANGO_SETTINGS_MODULE=config.settings.development
   SECRET_KEY=django-insecure-terranode-dev-key-change-in-production
   DEBUG=True
   ALLOWED_HOSTS=*
   CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   TELEMETRY_ENCRYPTION_KEY=MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=
   ```

3. Install dependencies:
   ```bash
   pipenv install --dev
   ```

4. Apply migrations and ensure telemetry encryption is backfilled:
   ```bash
   pipenv run python manage.py migrate
   pipenv run python manage.py migrate_telemetry_encryption
   ```

5. Start the development server:
   ```bash
   pipenv run python manage.py runserver 127.0.0.1:8000
   ```
   > Backend API is live at `http://127.0.0.1:8000/api/v1/`.

---

### 3. Frontend Setup (React SPA)

1. In a new terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Configure environment variables in `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   VITE_SUI_NETWORK=testnet
   # VITE_SUI_PACKAGE_ID=0x... (set after publishing the Move package)
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Start the frontend development server:
   ```bash
   pnpm run dev
   ```
   > Web app is live at `http://localhost:5173`.

---

## 👥 Pre-Configured Test Accounts

All demo accounts share the password: **`TerraNode2026!`**

| Role | Email | Password | Access / Features |
| :--- | :--- | :--- | :--- |
| **Farmer** | `iskartommy117@gmail.com` | `TerraNode2026!` | Telemetry charts, WMA yield forecasts, batch creation, 1-click carrier handover |
| **Logistics** | `logistics@terranode.agri` | `TerraNode2026!` | Custody transfer reception, active shipments, delivery confirmation |
| **Admin** | `admin@terranode.agri` | `TerraNode2026!` | System health monitoring, audit logs, user governance |

---

## 🌾 Core User Workflows

### 1. Farmer Flow (`/farmer`)
1. **Telemetry Logging:** Ingests temperature (°C), soil moisture (%), and soil pH. All readings are encrypted at rest with AES-256-GCM.
2. **Yield Forecasting:** The WMA algorithm weighs recent genuine sensor observations and applies crop-specific agronomic formulas (Maize, Rice, Soybean, Tomato, Cassava) to predict harvest yield (t/ha).
3. **Produce Batch Creation:** Links verified origin telemetry and calculates total batch weight from field area (hectares) with SHA-256 integrity hashing.
4. **1-Click Handover:** The farmer can hand over batches directly to an authorized logistics carrier with 1 click.

### 2. Logistics Flow (`/logistics`)
1. **Transfer Custody:** Select any active batch from a dropdown to record custody changes (`MINTED` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `DELIVERED`).
2. **Shipments & Tracking:** View live status and immutable audit history for all in-flight shipments.

### 3. Public Verification (`/verify`)
* Consumers can verify food provenance, harvest weight, field environmental readings, and cryptographic hash verification without logging in.

---

## 📦 Smart Contract Deployment (Sui Testnet)

To deploy the Move package to Sui Testnet:

1. Switch Sui client to Testnet:
   ```bash
   sui client switch --env testnet
   ```

2. Publish the package:
   ```bash
   cd contracts/agri_ledger
   sui client publish --gas-budget 100000000
   ```

3. Copy the published `PackageID` and add it to `frontend/.env`:
   ```env
   VITE_SUI_PACKAGE_ID=0x<your_published_package_id>
   ```

---

## 🧪 Testing & Verification

* **Backend Test Suite (50 Django unit & API tests):**
  ```bash
  cd backend
  pipenv run python manage.py test
  ```

* **Frontend Build & TypeScript Validation:**
  ```bash
  cd frontend
  pnpm run build
  ```
