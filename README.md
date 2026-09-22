# TerraNode

**TerraNode** is a deterministic, cryptographically anchored, and IoT-driven yield forecasting framework. 

In conventional agriculture, yield projections suffer from reliance on subjective farmer estimates, delayed surveys, or generic satellite imagery lacking root-zone resolution. TerraNode solves this by linking real-time physical environmental observations (soil temperature, soil moisture, and soil pH) directly to biological crop response equations. 

Every telemetry data point is signed via **SHA-256** and anchored to the **Sui blockchain** alongside harvested produce batches, guaranteeing non-repudiation, tamper-evidence, and end-to-end traceability.

## 🚀 Features

- **IoT Telemetry**: Continuous monitoring of Soil Temperature, Soil Moisture, and Soil pH.
- **Cryptographic Integrity**: SHA-256 digest generation for all raw telemetry readings.
- **Blockchain Digital Twins**: Sui Move smart contracts (`agri_ledger::mint_batch`) to mint `ProduceBatch` objects with immutable data integrity hashes.
- **Deterministic Yield Engine**: Yield predictions calculated via biological thermal stress penalties and moisture incentives.

## 📁 Project Structure

- `frontend/`: Web interface built with React, Vite, Tailwind CSS, and `@mysten/dapp-kit` for Web3 wallet integration.
- `backend/`: Python Django REST API, implementing the Deterministic WMA Prediction Engine and managing data synchronization.
- `contracts/`: Sui Move smart contracts for the Agri Ledger and digital twins.
- `docs/`: Detailed algorithmic, mathematical, and theoretical foundations of TerraNode.
- `latex-report/`: LaTeX source files for technical reports and academic whitepapers.

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (3.10 or higher)
- [Pipenv](https://pipenv.pypa.io/)
- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install)

### Installation

#### 1. Backend Setup (Django)

```bash
cd backend
pipenv install
pipenv shell
python manage.py migrate
python manage.py runserver
```

#### 2. Frontend Setup (React / Vite)

```bash
cd frontend
npm install
npm run dev
```

#### 3. Smart Contracts (Sui Move)

```bash
cd contracts
sui move build
sui client publish --gas-budget 100000000
```

## 📜 License

Please see the [LICENSE](./LICENSE) file for more details.
