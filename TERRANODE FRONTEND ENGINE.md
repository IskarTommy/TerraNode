# TERRANODE FRONTEND ENGINE: ARCHITECTURAL DESIGN

**Framework:** React 18 + TypeScript
**Build Tool:** Vite
**Charts:** Recharts
**HTTP Client:** Axios
**Routing:** React Router v6
**Blockchain:** @mysten/dapp-kit (Sui wallet integration)
**Hosting:** Vercel (free tier)

---

## 1. FRONTEND ARCHITECTURE OVERVIEW

The React frontend is a Single Page Application (SPA) that provides three role-specific
dashboards (Farmer, Logistics, Admin) with shared authentication infrastructure and
a unified design system.

### 1.1 Core Principles

1. **Role-Based Routing:** Users only see pages and navigation items relevant to their role
2. **JWT Lifecycle Management:** Access tokens are stored in memory (NOT localStorage),
   refresh tokens are handled via httpOnly cookies or secure storage
3. **Optimistic UI:** Forms show immediate feedback while awaiting API responses
4. **Wallet-First Blockchain UX:** All on-chain actions are triggered by the user via their
   browser wallet — the frontend never holds private keys

---

## 2. DIRECTORY STRUCTURE

```
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html                       # SPA entry point
├── public/
│   └── favicon.ico
│
└── src/
    ├── main.tsx                     # React root render + providers
    ├── App.tsx                      # Router configuration
    │
    ├── api/                         # API service layer
    │   ├── client.ts               # Axios instance + JWT interceptor
    │   ├── auth.ts                 # login(), register(), logout(), refreshToken()
    │   ├── telemetry.ts            # submitTelemetry(), getHistory(), getLatest()
    │   ├── ledger.ts               # prepareBatch(), confirmBatch(), transferBatch()
    │   └── analytics.ts            # predictYield(), getSummary()
    │
    ├── contexts/                    # React Context providers
    │   ├── AuthContext.tsx          # JWT state, user info, login/logout functions
    │   └── WalletContext.tsx        # Sui wallet connection state
    │
    ├── hooks/                       # Custom React hooks
    │   ├── useAuth.ts              # Shortcut to AuthContext
    │   └── useSuiWallet.ts         # Sui wallet interaction helpers
    │
    ├── guards/                      # Route protection components
    │   └── RoleGuard.tsx           # Wraps routes to enforce role-based access
    │
    ├── components/                  # Reusable UI components
    │   ├── Layout/
    │   │   ├── Sidebar.tsx         # Role-aware navigation sidebar
    │   │   ├── TopBar.tsx          # User info, logout button, wallet status
    │   │   └── DashboardLayout.tsx # Sidebar + TopBar + content area wrapper
    │   │
    │   ├── Charts/
    │   │   ├── TelemetryChart.tsx  # Time-series chart for temp/moisture/pH
    │   │   └── YieldPredictionChart.tsx  # Prediction confidence visualization
    │   │
    │   ├── Forms/
    │   │   ├── TelemetryForm.tsx   # Input form for sensor data submission
    │   │   ├── LoginForm.tsx       # Email + password login form
    │   │   ├── RegisterForm.tsx    # Registration with role selection
    │   │   └── MintBatchForm.tsx   # Crop type, weight, telemetry link → wallet sign
    │   │
    │   ├── Cards/
    │   │   ├── StatsCard.tsx       # Dashboard metric card (number + label + trend)
    │   │   ├── BatchCard.tsx       # Batch status card with lifecycle indicator
    │   │   └── TelemetryCard.tsx   # Single telemetry reading summary
    │   │
    │   └── Common/
    │       ├── LoadingSkeleton.tsx  # Animated placeholder while data loads
    │       ├── Toast.tsx           # Success/error notification popup
    │       └── EmptyState.tsx      # Friendly "no data yet" display
    │
    ├── pages/                       # Route-level page components
    │   ├── LoginPage.tsx
    │   ├── RegisterPage.tsx
    │   │
    │   ├── farmer/
    │   │   ├── FarmerDashboard.tsx     # Overview: stats, recent telemetry, yield preview
    │   │   ├── TelemetryPage.tsx       # Full telemetry history + submit form
    │   │   └── MintBatchPage.tsx       # Batch creation + wallet signing flow
    │   │
    │   ├── logistics/
    │   │   ├── LogisticsDashboard.tsx  # Overview: batches in transit, pending transfers
    │   │   └── TransferPage.tsx        # Accept/transfer batch custody
    │   │
    │   └── admin/
    │       ├── AdminDashboard.tsx      # System overview: user count, batch stats, health
    │       ├── UsersPage.tsx           # User management table
    │       └── AuditPage.tsx           # Integrity verification, anomaly log
    │
    ├── styles/
    │   └── index.css                # Global styles + CSS custom properties (design tokens)
    │
    ├── types/                       # TypeScript type definitions
    │   ├── user.ts                 # User, LoginRequest, RegisterRequest
    │   ├── telemetry.ts            # TelemetryRecord, TelemetrySubmission
    │   ├── ledger.ts               # ProduceBatch, BatchStatus
    │   └── analytics.ts            # PredictionResult, Summary
    │
    └── utils/
        ├── constants.ts            # API_BASE_URL, SUI_PACKAGE_ID, role enums
        └── formatters.ts           # Date formatting, number formatting helpers
```

---

## 3. ROUTING CONFIGURATION

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleGuard } from "./guards/RoleGuard";
import { DashboardLayout } from "./components/Layout/DashboardLayout";

// Public pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// Farmer pages
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import TelemetryPage from "./pages/farmer/TelemetryPage";
import MintBatchPage from "./pages/farmer/MintBatchPage";

// Logistics pages
import LogisticsDashboard from "./pages/logistics/LogisticsDashboard";
import TransferPage from "./pages/logistics/TransferPage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import AuditPage from "./pages/admin/AuditPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ─── Public Routes ──────────────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ─── Farmer Routes ──────────────── */}
        <Route element={<RoleGuard allowedRoles={["FARMER"]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
            <Route path="/farmer/telemetry" element={<TelemetryPage />} />
            <Route path="/farmer/mint" element={<MintBatchPage />} />
          </Route>
        </Route>

        {/* ─── Logistics Routes ───────────── */}
        <Route element={<RoleGuard allowedRoles={["LOGISTICS"]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/logistics/dashboard" element={<LogisticsDashboard />} />
            <Route path="/logistics/transfer/:batchId" element={<TransferPage />} />
          </Route>
        </Route>

        {/* ─── Admin Routes ───────────────── */}
        <Route element={<RoleGuard allowedRoles={["ADMIN"]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/audit" element={<AuditPage />} />
          </Route>
        </Route>

        {/* ─── Fallback ───────────────────── */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 4. CORE INFRASTRUCTURE

### 4.1 Axios Client with JWT Interceptor

```typescript
// src/api/client.ts
import axios from "axios";
import { API_BASE_URL } from "../utils/constants";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Request Interceptor: Attach JWT ────────────────
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();  // From AuthContext memory (NOT localStorage)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor: Handle 401 + Silent Refresh ──
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newAccess = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch {
        // Refresh failed → force logout
        logout();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### 4.2 Auth Context Provider

```tsx
// src/contexts/AuthContext.tsx
import { createContext, useState, useCallback, ReactNode } from "react";
import * as authApi from "../api/auth";

interface User {
  user_id: string;
  email: string;
  role: "FARMER" | "LOGISTICS" | "ADMIN";
  full_name: string;
  sui_public_key?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>(/* ... */);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    setAccessToken(response.access);
    setUser(response.user);
    // Store refresh token securely (httpOnly cookie handled by backend)
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setAccessToken(null);
    setUser(null);
  }, []);

  // ... register, refreshToken logic

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 4.3 Role Guard

```tsx
// src/guards/RoleGuard.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface RoleGuardProps {
  allowedRoles: string[];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user!.role)) {
    // Redirect to the user's own dashboard
    const dashboardMap: Record<string, string> = {
      FARMER: "/farmer/dashboard",
      LOGISTICS: "/logistics/dashboard",
      ADMIN: "/admin/dashboard",
    };
    return <Navigate to={dashboardMap[user!.role]} replace />;
  }

  return <Outlet />;
}
```

---

## 5. WALLET INTEGRATION (SUI)

### 5.1 Sui dApp Kit Setup

```tsx
// src/main.tsx
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
const networks = {
  testnet: { url: getFullnodeUrl("testnet") },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <SuiClientProvider networks={networks} defaultNetwork="testnet">
      <WalletProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </WalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>
);
```

### 5.2 Mint Batch Transaction Flow

```tsx
// src/pages/farmer/MintBatchPage.tsx (simplified)
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_PACKAGE_ID } from "../../utils/constants";

function MintBatchPage() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const handleMint = async (batchData: BatchPrepareResponse) => {
    // 1. Build the Sui transaction
    const tx = new Transaction();
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::agri_ledger::mint_batch`,
      arguments: [
        tx.pure.string(batchData.crop_type),
        tx.pure.u64(batchData.weight_kg),
        tx.pure.vector("u8", hexToBytes(batchData.data_integrity_hash)),
      ],
    });

    // 2. User signs with their wallet
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async (result) => {
          // 3. Extract sui_object_id from transaction effects
          const objectId = extractCreatedObjectId(result);

          // 4. Confirm with backend
          await ledgerApi.confirmBatch(batchData.batch_id, {
            sui_object_id: objectId,
            sui_tx_digest: result.digest,
          });

          toast.success("Batch minted successfully!");
        },
        onError: (error) => {
          toast.error("Transaction failed. Batch remains in PENDING state.");
        },
      }
    );
  };
}
```

---

## 6. PAGE SPECIFICATIONS

### 6.1 Farmer Dashboard (`/farmer/dashboard`)

| Component | Data Source | Description |
|---|---|---|
| StatsCard × 3 | `/telemetry/latest/` | Latest temperature, moisture, pH readings |
| StatsCard × 1 | `/analytics/predict/` | Predicted yield (metric tons) |
| TelemetryChart | `/telemetry/history/` | 30-day time series (temp + moisture + pH) |
| BatchCard list | `/ledger/batches/?farmer_id=me` | Recent batches with status badges |
| Quick Actions | Navigation links | "Log Reading" → TelemetryPage, "Mint Batch" → MintBatchPage |

### 6.2 Telemetry Page (`/farmer/telemetry`)

| Component | Description |
|---|---|
| TelemetryForm | Three numeric inputs (temp, moisture, pH) + Submit button |
| TelemetryChart | Full historical chart with date range picker |
| Telemetry table | Paginated table of all readings with SHA-256 hash column |

### 6.3 Mint Batch Page (`/farmer/mint`)

| Component | Description |
|---|---|
| MintBatchForm | Crop type dropdown, weight input, telemetry record selector |
| Wallet status | Shows connected wallet address or "Connect Wallet" button |
| Batch preview | Shows the hash that will be sent on-chain before signing |
| Transaction result | Success: shows Sui Object ID + Explorer link. Failure: retry prompt |

### 6.4 Logistics Dashboard (`/logistics/dashboard`)

| Component | Data Source | Description |
|---|---|---|
| StatsCard × 2 | `/ledger/batches/` | Batches in transit, batches pending transfer |
| BatchCard list | `/ledger/batches/?status=MINTED,IN_TRANSIT` | Actionable batch list |
| Transfer button | Per batch card | Opens wallet signing for `transfer_custody()` |

### 6.5 Admin Dashboard (`/admin/dashboard`)

| Component | Data Source | Description |
|---|---|---|
| StatsCard × 4 | Various endpoints | Total users, total batches, pending batches, flagged anomalies |
| Users table | `/admin/users/` | All users with role, status, registration date |
| System health | `/admin/health/` | DB status, Redis ping, Celery worker status |
| Audit log | `/admin/audit-log/` | Recent actions with timestamps |

---

## 7. DESIGN SYSTEM

### 7.1 CSS Custom Properties (Design Tokens)

```css
/* src/styles/index.css */
:root {
  /* ─── Colors ─────────────────────────── */
  --color-primary: #10B981;          /* Emerald green (agricultural theme) */
  --color-primary-dark: #059669;
  --color-primary-light: #34D399;
  --color-secondary: #3B82F6;        /* Blue (analytics/data) */
  --color-accent: #F59E0B;           /* Amber (warnings/highlights) */
  --color-danger: #EF4444;           /* Red (errors/critical) */

  --color-bg-primary: #0F172A;       /* Dark navy background */
  --color-bg-secondary: #1E293B;     /* Card/sidebar background */
  --color-bg-tertiary: #334155;      /* Hover states */

  --color-text-primary: #F8FAFC;     /* White text */
  --color-text-secondary: #94A3B8;   /* Muted text */
  --color-text-accent: #10B981;      /* Highlighted text */

  --color-border: #334155;           /* Subtle borders */

  /* ─── Typography ─────────────────────── */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;

  /* ─── Spacing ────────────────────────── */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* ─── Borders & Shadows ──────────────── */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.3);
  --shadow-glow: 0 0 20px rgba(16, 185, 129, 0.15);

  /* ─── Transitions ────────────────────── */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}
```

### 7.2 Visual Style Guide

- **Theme:** Dark mode with emerald green accents (agricultural/nature theme)
- **Cards:** Glassmorphism with subtle backdrop blur and border glow on hover
- **Charts:** Gradient fills under line charts, animated data point transitions
- **Buttons:** Rounded with hover scale + glow effect
- **Status badges:** Color-coded pills (PENDING=amber, MINTED=green, IN_TRANSIT=blue, DELIVERED=emerald)
- **Typography:** Inter font family from Google Fonts
- **Animations:** Subtle fade-in on page load, slide transitions between routes

---

## 8. TYPESCRIPT TYPE DEFINITIONS

```typescript
// src/types/user.ts
export interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: "FARMER" | "LOGISTICS" | "ADMIN";
  sui_public_key?: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role: "FARMER" | "LOGISTICS" | "ADMIN";
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}
```

```typescript
// src/types/telemetry.ts
export interface TelemetryRecord {
  log_id: string;
  farmer_id: string;
  recorded_at: string;
  temperature_celsius: number;
  soil_moisture_percentage: number;
  soil_ph: number;
  payload_sha256: string;
}

export interface TelemetrySubmission {
  temperature: number;
  soil_moisture: number;
  soil_ph: number;
}
```

```typescript
// src/types/ledger.ts
export type BatchStatus = "PENDING" | "MINTED" | "IN_TRANSIT" | "DELIVERED";

export interface ProduceBatch {
  batch_id: string;
  farmer_id: string;
  crop_type: string;
  weight_kg: number;
  data_integrity_hash: string;
  status: BatchStatus;
  sui_object_id?: string;
  sui_tx_digest?: string;
  current_custodian_id?: string;
  origin_telemetry_id?: string;
  created_at: string;
  updated_at: string;
}
```

```typescript
// src/types/analytics.ts
export interface PredictionResult {
  confidence_score: number;
  predicted_yield_metric_tons: number;
  historical_variance_index: number;
  data_points_analyzed: number;
  recommendation: string;
}

export interface TelemetrySummary {
  avg_temperature: number;
  avg_moisture: number;
  avg_ph: number;
  total_readings: number;
  date_range: { start: string; end: string };
}
```

---

## 9. FRONTEND COMPONENT CHECKLIST

### Phase 3A: Frontend Foundation
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install dependencies (react-router-dom, axios, recharts, @mysten/dapp-kit)
- [ ] Set up CSS design system with custom properties
- [ ] Import Inter font from Google Fonts
- [ ] Create Axios client with JWT interceptor
- [ ] Create AuthContext provider
- [ ] Create RoleGuard component
- [ ] Build LoginPage and RegisterPage
- [ ] Build DashboardLayout (Sidebar + TopBar)

### Phase 3B: Farmer Pages
- [ ] Build FarmerDashboard with StatsCards
- [ ] Build TelemetryForm component
- [ ] Build TelemetryChart component (Recharts)
- [ ] Build TelemetryPage (form + chart + table)
- [ ] Build YieldPredictionChart

### Phase 4A: Blockchain Integration
- [ ] Set up Sui dApp Kit providers
- [ ] Build WalletContext
- [ ] Build MintBatchForm with wallet signing
- [ ] Build MintBatchPage (full flow)
- [ ] Build BatchCard component

### Phase 4B: Logistics & Admin Pages
- [ ] Build LogisticsDashboard
- [ ] Build TransferPage with wallet signing
- [ ] Build AdminDashboard
- [ ] Build UsersPage with data table
- [ ] Build AuditPage with integrity verification
