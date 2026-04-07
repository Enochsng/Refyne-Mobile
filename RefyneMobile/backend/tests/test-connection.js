// Simple test script to verify backend connectivity
const fetch = require('node-fetch');

const testUrls = [
  'http://localhost:3001/health',
  'http://192.168.1.79:3001/health',
  'http://127.0.0.1:3001/health'
];

async function testConnections() {
  console.log('🧪 Testing backend connections...\n');
  
  for (const url of testUrls) {
    try {
      console.log(`Testing: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS: ${url}`);
        console.log(`   Response:`, data);
      } else {
        console.log(`❌ FAILED: ${url} - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${url} - ${error.message}`);
    }
    console.log('');
  }
}

testConnections();
