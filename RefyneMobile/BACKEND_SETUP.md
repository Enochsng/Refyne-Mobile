# Backend Server Setup for Refyne Mobile

## Quick Start

To fix the HTTP 404 errors on the coach Earnings page, you need to start the backend server.

### Option 1: Using the provided script (Recommended)

```bash
# From the RefyneMobile root directory
./start-backend.sh
```

### Option 2: Manual setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already installed)
npm install

# Start the development server
npm run dev
```

## What this fixes

The HTTP 404 errors you're seeing are because the backend server is not running. The frontend is trying to connect to API endpoints like:

- `http://192.168.1.79:3001/api/connect/coach/{id}/status`
- `http://192.168.1.79:3001/api/connect/start-onboarding`

These endpoints are defined in the backend server but only work when the server is running.

## Server Information

- **Port**: 3001
- **Health Check**: http://localhost:3001/health
- **Network Access**: http://YOUR_IP:3001/health (replace YOUR_IP with your computer's IP)

## Environment Setup

Make sure you have a `.env` file in the `backend/` directory with your Stripe keys:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Troubleshooting

1. **Port 3001 already in use**: Kill any process using port 3001 or change the port in `backend/server.js`
2. **Network connection issues**: Make sure your mobile device/simulator is on the same network as your computer
3. **Stripe errors**: Verify your Stripe keys are correct and active

## Expected Behavior After Starting Server

Once the backend server is running, the coach Earnings page should:
- ✅ Stop showing HTTP 404 errors
- ✅ Successfully check Stripe account status
- ✅ Allow connecting Stripe accounts
- ✅ Display proper error messages if there are other issues

The console errors should disappear and be replaced with successful API calls or more specific error messages.
