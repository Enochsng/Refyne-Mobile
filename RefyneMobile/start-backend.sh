#!/bin/bash

# Start Backend Server Script for Refyne Mobile
# This script helps start the backend server for the Refyne Mobile app

echo "🚀 Starting Refyne Mobile Backend Server..."
echo ""

# Check if we're in the right directory
if [ ! -f "backend/server.js" ]; then
    echo "❌ Error: Please run this script from the RefyneMobile root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected to find: backend/server.js"
    exit 1
fi

# Navigate to backend directory
cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: No .env file found"
    echo "   Please create a .env file with your Stripe keys and other configuration"
    echo "   You can copy from env.example if it exists"
    echo ""
fi

# Start the server
echo "🔗 Starting server on port 3001..."
echo "   Health check: http://localhost:3001/health"
echo "   Network access: http://$(hostname -I | awk '{print $1}'):3001/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm run dev
