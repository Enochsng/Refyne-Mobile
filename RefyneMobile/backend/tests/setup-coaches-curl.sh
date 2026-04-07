#!/bin/bash

echo "🚀 Setting up Stripe Connect accounts for coaches..."

# Coach 1: Enokski
echo ""
echo "============================================================"
echo "Setting up: Enokski (golf)"
echo "============================================================"

curl -X POST http://localhost:3001/api/connect/create-account \
  -H "Content-Type: application/json" \
  -d '{
    "coachId": "e9f47d75-cd92-4a0f-810c-7258ea03d47f",
    "coachName": "Enokski",
    "email": "enokski@refyne.com",
    "sport": "golf",
    "country": "CA",
    "businessType": "individual"
  }' | jq '.'

echo ""
echo "Waiting 2 seconds..."
sleep 2

# Coach 2: Test Coach
echo ""
echo "============================================================"
echo "Setting up: Test Coach (golf)"
echo "============================================================"

curl -X POST http://localhost:3001/api/connect/create-account \
  -H "Content-Type: application/json" \
  -d '{
    "coachId": "test_coach",
    "coachName": "Test Coach",
    "email": "testcoach@refyne.com",
    "sport": "golf",
    "country": "CA",
    "businessType": "individual"
  }' | jq '.'

echo ""
echo "============================================================"
echo "📊 Setup Complete!"
echo "============================================================"
echo ""
echo "🎉 Next steps:"
echo "1. Run: node list-coaches-for-stripe-setup.js (to verify accounts were created)"
echo "2. Test payments to ensure money goes to the correct accounts"
echo ""
