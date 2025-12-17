# VPS Deployment Guide for Refyne Backend

This guide will help you deploy the Refyne backend to your VPS using PM2.

## Quick Fix for Current Error

If you're getting the "Cannot find module 'express'" error, run these commands on your VPS:

```bash
cd /home/enoch/apps/Refyne-Mobile/RefyneMobile/backend
npm install
pm2 restart refyne-backend
```

## Full Deployment Process

### Step 1: SSH into your VPS

```bash
ssh enoch@your-vps-ip
```

### Step 2: Navigate to the backend directory

```bash
cd /home/enoch/apps/Refyne-Mobile/RefyneMobile/backend
```

### Step 3: Install dependencies

```bash
npm install --production
```

This will install all required packages including `express`, `stripe`, `cors`, etc.

### Step 4: Ensure .env file exists

Make sure you have a `.env` file in the backend directory with all required environment variables:

```bash
# If you don't have .env, copy from env.example
cp env.example .env
# Then edit .env with your actual values
nano .env
```

Required environment variables:
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `PORT` (default: 3001)
- `NODE_ENV` (production for VPS)

### Step 5: Deploy using the deployment script (Recommended)

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

The script will:
- Check if dependencies are installed
- Install dependencies if needed
- Stop any existing PM2 process
- Start the app with PM2
- Save PM2 configuration

### Step 6: Alternative - Manual PM2 Setup

If you prefer to set up PM2 manually:

```bash
# Using ecosystem config
pm2 start ecosystem.config.js

# Or directly
pm2 start server.js --name refyne-backend --cwd /home/enoch/apps/Refyne-Mobile/RefyneMobile/backend

# Save PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup
# Follow the instructions it provides
```

## PM2 Management Commands

```bash
# View logs
pm2 logs refyne-backend

# View real-time logs
pm2 logs refyne-backend --lines 100

# Restart the app
pm2 restart refyne-backend

# Stop the app
pm2 stop refyne-backend

# Start the app
pm2 start refyne-backend

# Delete the app from PM2
pm2 delete refyne-backend

# View status
pm2 status

# Monitor resources
pm2 monit

# View detailed info
pm2 show refyne-backend
```

## Troubleshooting

### Error: Cannot find module 'express'

**Solution:** Dependencies are not installed. Run:
```bash
cd /home/enoch/apps/Refyne-Mobile/RefyneMobile/backend
npm install
pm2 restart refyne-backend
```

### Error: Port 3001 already in use

**Solution:** Either stop the process using port 3001 or change the port in your `.env` file:
```bash
# Find what's using port 3001
sudo lsof -i :3001

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or change PORT in .env
PORT=3002
```

### PM2 process keeps crashing

**Solution:** Check the logs to see what's wrong:
```bash
pm2 logs refyne-backend --err
```

Common issues:
- Missing environment variables in `.env`
- Database connection issues
- Invalid Stripe keys

### Dependencies not installing

**Solution:** Make sure you have Node.js and npm installed:
```bash
node --version  # Should be v16 or higher
npm --version
```

If using nvm:
```bash
nvm use 24.11.1  # Or your Node version
```

## Updating the Application

When you update the code on your VPS:

```bash
cd /home/enoch/apps/Refyne-Mobile/RefyneMobile/backend

# Pull latest changes (if using git)
git pull

# Install any new dependencies
npm install --production

# Restart PM2
pm2 restart refyne-backend
```

Or use the deployment script:
```bash
./deploy.sh
```

## Environment Variables

Make sure your `.env` file on the VPS has all required variables. The file should NOT be committed to git (it's in .gitignore).

Key variables for production:
- `NODE_ENV=production`
- `PORT=3001` (or your chosen port)
- All Stripe keys
- All Supabase keys
- `ALLOWED_ORIGINS` with your production domains

## Health Check

After deployment, verify the server is running:

```bash
# From your VPS
curl http://localhost:3001/health

# From your local machine
curl http://your-vps-ip:3001/health
```

You should see:
```json
{
  "status": "OK",
  "timestamp": "2024-...",
  "environment": "production"
}
```

## Security Notes

1. **Never commit `.env` file** - It contains sensitive keys
2. **Use production Stripe keys** - Not test keys
3. **Set up firewall** - Only expose necessary ports
4. **Use HTTPS** - Set up SSL/TLS for production
5. **Keep dependencies updated** - Regularly run `npm audit` and update packages

## Monitoring

Set up monitoring to track your application:

```bash
# PM2 monitoring
pm2 monit

# Or use PM2 Plus (cloud monitoring)
pm2 link
```

## Auto-restart on Server Reboot

To ensure PM2 starts your app automatically after server reboot:

```bash
pm2 startup
# Follow the instructions it provides (usually involves running a sudo command)
pm2 save
```

