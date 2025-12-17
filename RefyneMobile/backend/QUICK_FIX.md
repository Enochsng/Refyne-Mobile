# Quick Fix for "Cannot find module 'express'" Error

## Immediate Solution

SSH into your VPS and run these commands:

```bash
cd /home/enoch/apps/Refyne-Mobile/RefyneMobile/backend
npm install
pm2 restart refyne-backend
```

That's it! The error should be resolved.

## What Happened?

The error occurred because the `node_modules` directory (containing all dependencies like `express`, `stripe`, etc.) was missing or incomplete in your backend directory on the VPS.

## Verification

After running the commands above, check if it's working:

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs refyne-backend --lines 50

# Test the health endpoint
curl http://localhost:3001/health
```

You should see the server running without errors.

## For Future Deployments

Use the deployment script to prevent this issue:

```bash
cd /home/enoch/apps/Refyne-Mobile/RefyneMobile/backend
chmod +x deploy.sh
./deploy.sh
```

This script automatically installs dependencies before starting PM2.

## Still Having Issues?

1. **Check Node.js version:**
   ```bash
   node --version
   ```
   Should be v16 or higher. If using nvm:
   ```bash
   nvm use 24.11.1
   ```

2. **Check if .env file exists:**
   ```bash
   ls -la .env
   ```
   If missing, copy from `env.example` and update with your values.

3. **Check PM2 logs for other errors:**
   ```bash
   pm2 logs refyne-backend --err
   ```

4. **Verify you're in the correct directory:**
   ```bash
   pwd
   # Should be: /home/enoch/apps/Refyne-Mobile/RefyneMobile/backend
   ```

