# Backend Connection Fix

## The Problem
The React Native app was getting "Network request failed" errors when trying to connect to the backend server.

## The Solution
I've updated the payment service to:

1. **Try multiple URLs** - The app will now try different URLs to find one that works
2. **Store the working URL** - Once a connection is successful, it remembers which URL works
3. **Better error handling** - More detailed logging to help debug connection issues

## What I Fixed

### 1. Updated Payment Service (`services/paymentService.js`)
- Added fallback URLs for different network configurations
- Added automatic URL discovery
- Improved error logging
- All API calls now use the working URL

### 2. Backend Server
- ✅ Server is running on port 3001
- ✅ All endpoints are accessible
- ✅ CORS is properly configured

## How to Test

1. **Make sure the backend is running:**
   ```bash
   cd /Users/enoch/RefyneMobile/RefyneMobile/backend
   npm start
   ```

2. **In your React Native app:**
   - Go to the PaywallScreen
   - The app will automatically test different URLs
   - Check the console logs to see which URL works
   - Try to create a checkout session

## Expected Behavior

When you open the PaywallScreen, you should see logs like:
```
Testing backend connection to: http://192.168.1.79:3001/health
Backend connection successful: {status: "OK", ...}
Using URL: http://192.168.1.79:3001/health
Working API URL set to: http://192.168.1.79:3001/api
```

## If It Still Doesn't Work

1. **Check your network:**
   - Make sure your computer and phone/simulator are on the same WiFi network
   - Try using your computer's IP address instead of 192.168.1.79

2. **Check the console logs:**
   - Look for which URLs are being tested
   - See which ones fail and why

3. **Try different URLs:**
   - If you're using iOS Simulator, try `http://localhost:3001/api`
   - If you're using Android Emulator, try `http://10.0.2.2:3001/api`

## Next Steps

Once the connection is working:
1. Create the database tables using `setup-database.sql`
2. Test the payment flow
3. Verify DM creation after successful payment

The backend server is already running and ready to handle requests!
