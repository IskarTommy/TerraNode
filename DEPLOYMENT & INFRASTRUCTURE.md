# TERRANODE DEPLOYMENT & INFRASTRUCTURE GUIDE

**Backend Host:** Render (free tier)
**Database Host:** Neon (serverless PostgreSQL, free tier)
**Redis Host:** Upstash (free tier — 500K commands/month, 256MB)
**Frontend Host:** Vercel (free tier)
**Blockchain:** Sui Testnet (free test tokens)
**Uptime Monitor:** UptimeRobot (free — keeps Render from sleeping)

---

## 1. INFRASTRUCTURE ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          INTERNET                                      │
│                                                                        │
│   User Browser ──► https://terranode.vercel.app  (React SPA)           │
│        │                    │                                           │
│        │                    │ API calls (HTTPS)                         │
│        │                    ▼                                           │
│        │           https://terranode-api.onrender.com  (Django)         │
│        │                    │                   │                       │
│        │                    ▼                   ▼                       │
│        │           ┌──────────────┐    ┌────────────────┐              │
│        │           │ Neon         │    │ Upstash        │              │
│        │           │ PostgreSQL   │    │ Redis          │              │
│        │           │ (Free Tier)  │    │ (Free Tier)    │              │
│        │           └──────────────┘    └────────────────┘              │
│        │                                                               │
│        │ Sui Wallet RPC                                                │
│        ▼                                                               │
│   https://fullnode.testnet.sui.io  (Sui Testnet)                       │
│                                                                        │
│   ┌──────────────────────┐                                             │
│   │ UptimeRobot          │──── Pings Render every 14 min               │
│   │ (Free Monitor)       │     to prevent cold starts                  │
│   └──────────────────────┘                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. FREE TIER SPECIFICATIONS

### 2.1 Render (Backend Hosting)

| Feature | Details |
|---|---|
| **Plan** | Free Web Service |
| **Deployment** | Auto-deploy from GitHub `main` branch |
| **Build Command** | `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate` |
| **Start Command** | `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT` |
| **Sleep Behavior** | Spins down after 15 minutes of inactivity |
| **Cold Start** | ~30-60 seconds on first request after sleeping |
| **Workaround** | UptimeRobot pings the `/api/v1/admin/health/` endpoint every 14 minutes |

### 2.2 Neon (PostgreSQL Database)

| Feature | Details |
|---|---|
| **Plan** | Free Tier |
| **Engine** | PostgreSQL 16, serverless |
| **Compute** | Scales to zero when idle (no cost when not in use) |
| **Storage** | 0.5 GB included (more than enough for school project) |
| **Branching** | Supports database branching (useful for testing) |
| **Connection** | Standard `postgres://` connection string with SSL |
| **No Expiry** | Unlike Render's DB (90-day limit), Neon free tier persists |

### 2.3 Upstash (Redis)

| Feature | Details |
|---|---|
| **Plan** | Free Tier |
| **Commands** | 500,000 per month |
| **Storage** | 256 MB |
| **Protocol** | Standard Redis protocol over TLS (`rediss://`) |
| **REST API** | Also available via HTTP REST (useful for serverless) |
| **No Credit Card** | No payment method required |
| **Use Cases** | JWT blacklist, rate limiting, analytics cache, Celery broker |

### 2.4 Vercel (Frontend Hosting)

| Feature | Details |
|---|---|
| **Plan** | Hobby (Free) |
| **Deployment** | Auto-deploy from GitHub push |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist/` (Vite default) |
| **CDN** | Global edge network (fast worldwide) |
| **Bandwidth** | 100 GB/month |
| **Custom Domain** | Supported (optional) |
| **Environment Variables** | `VITE_API_BASE_URL=https://terranode-api.onrender.com/api/v1` |

### 2.5 Sui Testnet

| Feature | Details |
|---|---|
| **Network** | Testnet (not mainnet — no real money) |
| **RPC URL** | `https://fullnode.testnet.sui.io` |
| **Faucet** | https://faucet.sui.io (free test SUI tokens) |
| **Explorer** | https://testnet.suivision.xyz |
| **Cost** | Completely free (test tokens have no value) |

---

## 3. LOCAL DEVELOPMENT SETUP

### 3.1 Prerequisites

| Tool | Version | Installation |
|---|---|---|
| **Python** | 3.12+ | https://python.org/downloads/ |
| **Node.js** | 20+ LTS | https://nodejs.org/ |
| **PostgreSQL** | 16+ | https://postgresql.org/download/ or use Docker |
| **Redis** | 7+ | Windows: Use Docker or Memurai. Mac/Linux: `brew install redis` |
| **Sui CLI** | Latest testnet | `suiup install sui@testnet` |
| **Pipenv** | Latest | `pip install pipenv` |
| **Git** | Latest | https://git-scm.com/ |

### 3.2 Backend Setup (Step by Step)

```bash
# 1. Clone the repository
git clone <repository-url>
cd TerraNode

# 2. Set up Python environment
cd backend
pipenv install --dev
pipenv shell

# 3. Create .env file from template
cp .env.example .env
# Edit .env with your local database credentials

# 4. Set up local PostgreSQL database
# Option A: Local PostgreSQL installation
createdb terranode

# Option B: Use Neon even in development (recommended)
# Sign up at neon.tech, create a database, copy the connection string to .env

# 5. Run migrations
python manage.py migrate

# 6. Create a superuser (admin account)
python manage.py createsuperuser

# 7. Start the development server
python manage.py runserver

# Backend is now running at http://localhost:8000
```

### 3.3 Frontend Setup (Step by Step)

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node.js dependencies
npm install

# 3. Create environment file
echo "VITE_API_BASE_URL=http://localhost:8000/api/v1" > .env.local

# 4. Start the development server
npm run dev

# Frontend is now running at http://localhost:5173
```

### 3.4 Redis Setup (Local Development)

```bash
# Option A: Docker (recommended for Windows)
docker run -d --name terranode-redis -p 6379:6379 redis:7-alpine

# Option B: Use Upstash even in development
# Sign up at upstash.com, create a Redis database, copy the URL to .env

# Option C: Windows native (Memurai)
# Download from https://www.memurai.com/get-memurai
```

### 3.5 Sui Smart Contract Setup

```bash
# 1. Install Sui CLI
suiup install sui@testnet

# 2. Verify installation
sui --version

# 3. Set up wallet
sui client          # Follow prompts to create/import a key pair

# 4. Switch to testnet
sui client switch --env testnet

# 5. Get test tokens
# Visit https://faucet.sui.io and paste your address

# 6. Navigate to contracts directory
cd contracts

# 7. Build and test
sui move build
sui move test

# 8. Deploy to testnet
sui client publish --gas-budget 10000000

# 9. Save the Package ID (displayed in output)
# Add to frontend .env: VITE_SUI_PACKAGE_ID=0x...
# Add to backend .env: SUI_PACKAGE_ID=0x...
```

---

## 4. PRODUCTION DEPLOYMENT

### 4.1 Deploy Database (Neon)

1. Go to https://neon.tech and sign up (free, no credit card)
2. Click "Create Project" → name it "terranode"
3. Copy the connection string:
   ```
   postgres://user:password@ep-xxxxx.us-east-1.aws.neon.tech/terranode?sslmode=require
   ```
4. Save this as `DATABASE_URL` in Render's environment variables

### 4.2 Deploy Redis (Upstash)

1. Go to https://upstash.com and sign up (free, no credit card)
2. Click "Create Database" → name it "terranode-cache"
3. Select the region closest to your Render deployment
4. Copy the Redis connection string:
   ```
   rediss://default:xxxxx@us1-xxxxx.upstash.io:6379
   ```
5. Save this as `REDIS_URL` in Render's environment variables

### 4.3 Deploy Backend (Render)

1. Push your code to GitHub
2. Go to https://render.com and sign up
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name:** `terranode-api`
   - **Region:** Same as Neon/Upstash
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install pipenv && pipenv install --system --deploy && python manage.py collectstatic --noinput && python manage.py migrate`
   - **Start Command:** `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
6. Add environment variables:
   ```
   DJANGO_SECRET_KEY=<generate-a-random-string>
   DJANGO_DEBUG=False
   DJANGO_SETTINGS_MODULE=config.settings.production
   DJANGO_ALLOWED_HOSTS=terranode-api.onrender.com
   DATABASE_URL=<neon-connection-string>
   REDIS_URL=<upstash-connection-string>
   CORS_ALLOWED_ORIGINS=https://terranode.vercel.app
   ```
7. Click "Create Web Service"

### 4.4 Deploy Frontend (Vercel)

1. Go to https://vercel.com and sign up (connect GitHub)
2. Click "Import Project" → select your repository
3. Configure:
   - **Framework:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variables:
   ```
   VITE_API_BASE_URL=https://terranode-api.onrender.com/api/v1
   VITE_SUI_PACKAGE_ID=<your-deployed-package-id>
   VITE_SUI_NETWORK=testnet
   ```
5. Click "Deploy"

### 4.5 Set Up Uptime Monitoring (UptimeRobot)

This prevents Render's free tier from sleeping during your demo/presentation.

1. Go to https://uptimerobot.com and sign up (free)
2. Click "Add New Monitor"
3. Configure:
   - **Type:** HTTP(s)
   - **Friendly Name:** TerraNode API
   - **URL:** `https://terranode-api.onrender.com/api/v1/admin/health/`
   - **Monitoring Interval:** 14 minutes (must be less than Render's 15-min sleep timer)
4. Click "Create Monitor"

---

## 5. ENVIRONMENT VARIABLE REFERENCE

### Backend (.env)

| Variable | Development Value | Production Value | Description |
|---|---|---|---|
| `DJANGO_SECRET_KEY` | `dev-secret-key-change-me` | `<random-50-char-string>` | Django secret key |
| `DJANGO_DEBUG` | `True` | `False` | Debug mode toggle |
| `DJANGO_SETTINGS_MODULE` | `config.settings.development` | `config.settings.production` | Settings file to use |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | `terranode-api.onrender.com` | Allowed HTTP host headers |
| `DATABASE_URL` | `postgres://user:pass@localhost:5432/terranode` | `postgres://user:pass@ep-xxx.neon.tech/terranode?sslmode=require` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379/0` | `rediss://default:xxx@us1-xxx.upstash.io:6379` | Redis connection (note `rediss://` for TLS) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | `https://terranode.vercel.app` | Allowed CORS origins |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | `15` | `15` | Access token expiry |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | `7` | `7` | Refresh token expiry |
| `SUI_PACKAGE_ID` | `<testnet-package-id>` | `<testnet-package-id>` | Deployed Move contract address |
| `SUI_NETWORK` | `testnet` | `testnet` | Sui network name |

### Frontend (.env.local / Vercel)

| Variable | Development Value | Production Value | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | `https://terranode-api.onrender.com/api/v1` | Backend API base URL |
| `VITE_SUI_PACKAGE_ID` | `<testnet-package-id>` | `<testnet-package-id>` | Deployed Move contract address |
| `VITE_SUI_NETWORK` | `testnet` | `testnet` | Sui network name |

---

## 6. CI/CD PIPELINE (AUTOMATIC)

Both Render and Vercel support automatic deployments from GitHub:

```
Developer pushes to 'main' branch
         │
         ├──► Render detects push → builds backend → runs migrations → deploys
         │
         └──► Vercel detects push → builds frontend → deploys to CDN
```

No manual deployment steps required after initial setup. Just push to `main`.

---

## 7. TROUBLESHOOTING

### Common Issues

| Issue | Cause | Fix |
|---|---|---|
| Backend returns 500 on first request | Render cold start (free tier) | Wait 30-60 seconds, or set up UptimeRobot |
| "DisallowedHost" error | `ALLOWED_HOSTS` doesn't include Render URL | Add `terranode-api.onrender.com` to `DJANGO_ALLOWED_HOSTS` |
| CORS error in browser console | Frontend domain not in `CORS_ALLOWED_ORIGINS` | Add `https://terranode.vercel.app` to the env var |
| "Connection refused" to Redis | Wrong `REDIS_URL` or local Redis not running | Check URL format; use `rediss://` (with double s) for Upstash TLS |
| Database connection timeout | Neon compute scaled to zero | First connection may be slow (~2s); Neon auto-scales up |
| Sui wallet not connecting | Wrong network or missing extension | Ensure Sui Wallet extension is installed and set to "Testnet" |
| "Insufficient gas" on Sui | Test wallet out of SUI tokens | Get more from https://faucet.sui.io |
| Static files not loading (Render) | WhiteNoise not configured | Ensure `whitenoise` is in middleware and `collectstatic` runs in build |

---

## 8. DEPLOYMENT CHECKLIST

- [ ] Create Neon account and database
- [ ] Create Upstash account and Redis instance
- [ ] Create Render account and connect GitHub
- [ ] Set all backend environment variables in Render
- [ ] Deploy backend and verify `/api/v1/admin/health/` returns 200
- [ ] Run `python manage.py migrate` on Render (happens in build command)
- [ ] Create admin user via Render shell: `python manage.py createsuperuser`
- [ ] Create Vercel account and connect GitHub
- [ ] Set all frontend environment variables in Vercel
- [ ] Deploy frontend and verify login page loads
- [ ] Deploy Sui Move contract to testnet
- [ ] Update `SUI_PACKAGE_ID` in both Render and Vercel env vars
- [ ] Set up UptimeRobot monitor
- [ ] Run full end-to-end test (register → login → submit telemetry → mint batch)
