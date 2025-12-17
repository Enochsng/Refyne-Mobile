#!/bin/bash

# Deployment script for Refyne Backend on VPS
# This script ensures all dependencies are installed before starting PM2

set -e  # Exit on any error

echo "🚀 Deploying Refyne Backend..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📂 Working directory: $(pwd)"
echo ""

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "   Please make sure you're in the backend directory"
    exit 1
fi

# Check if node_modules exists or if package.json is newer
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --production
    echo "✅ Dependencies installed successfully"
    echo ""
else
    echo "✅ Dependencies already installed"
    echo ""
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: No .env file found"
    if [ -f "env.example" ]; then
        echo "   You can copy env.example to .env and update it with your values"
    fi
    echo ""
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop existing PM2 process if running
echo "🛑 Stopping existing PM2 process (if running)..."
pm2 stop refyne-backend 2>/dev/null || true
pm2 delete refyne-backend 2>/dev/null || true
echo ""

# Start with PM2
echo "🚀 Starting application with PM2..."
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
else
    pm2 start server.js --name refyne-backend --cwd "$SCRIPT_DIR"
fi

# Save PM2 configuration
pm2 save

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 PM2 Status:"
pm2 status
echo ""
echo "📝 Useful commands:"
echo "   pm2 logs refyne-backend          # View logs"
echo "   pm2 restart refyne-backend       # Restart the app"
echo "   pm2 stop refyne-backend          # Stop the app"
echo "   pm2 monit                        # Monitor resources"

