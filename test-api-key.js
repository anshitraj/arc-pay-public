/**
 * API Key Test Script
 * 
 * This script helps you test if your API key is working correctly.
 * 
 * Usage:
 *   node test-api-key.js <your-api-key>
 * 
 * Or set it as an environment variable:
 *   API_KEY=your-api-key node test-api-key.js
 * 
 * The script will test your API key against the /api/test endpoint
 * and show you if it's valid and working.
 * 
 * Requirements:
 *   - Node.js 18+ (for built-in fetch) OR
 *   - Install node-fetch: npm install node-fetch
 */

// Support both built-in fetch (Node 18+) and node-fetch
let fetch;
try {
  // Try built-in fetch first (Node 18+)
  if (typeof globalThis.fetch === 'function') {
    fetch = globalThis.fetch;
  } else {
    // Fallback to node-fetch for older Node versions
    fetch = require('node-fetch');
  }
} catch (e) {
  console.error('❌ Error: fetch is not available. Please use Node.js 18+ or install node-fetch:');
  console.error('   npm install node-fetch');
  process.exit(1);
}

const API_KEY = process.argv[2] || process.env.API_KEY;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

if (!API_KEY) {
  console.error('❌ Error: API key is required');
  console.error('');
  console.error('Usage:');
  console.error('  node test-api-key.js <your-api-key>');
  console.error('  or');
  console.error('  API_KEY=your-api-key node test-api-key.js');
  process.exit(1);
}

async function testApiKey() {
  console.log('🔑 Testing API Key...');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔐 API Key: ${API_KEY.substring(0, 20)}...`);
  console.log('');

  try {
    // Test with Authorization header (Bearer token)
    console.log('📡 Testing with Authorization header (Bearer token)...');
    const response1 = await fetch(`${BASE_URL}/api/test`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data1 = await response1.json();
    
    if (response1.ok) {
      console.log('✅ SUCCESS! API key is valid and working!');
      console.log('');
      console.log('Merchant Info:');
      console.log(`  ID: ${data1.merchant.id}`);
      console.log(`  Name: ${data1.merchant.name}`);
      console.log(`  Wallet: ${data1.merchant.walletAddress || 'N/A'}`);
      if (data1.apiKey) {
        console.log('');
        console.log('API Key Info:');
        console.log(`  Type: ${data1.apiKey.keyType}`);
        console.log(`  Mode: ${data1.apiKey.mode}`);
        console.log(`  Name: ${data1.apiKey.name || 'N/A'}`);
        console.log(`  Created: ${data1.apiKey.createdAt}`);
        console.log(`  Last Used: ${data1.apiKey.lastUsedAt || 'Never'}`);
      }
      console.log('');
      console.log('✅ Your API key is ready to use in your application!');
      return true;
    } else {
      console.log(`❌ FAILED: ${data1.error || 'Unknown error'}`);
      console.log(`   Status: ${response1.status}`);
      if (data1.message) {
        console.log(`   Message: ${data1.message}`);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing API key:', error.message);
    return false;
  }
}

// Test with x-api-key header as well
async function testWithXApiKeyHeader() {
  try {
    console.log('');
    console.log('📡 Testing with x-api-key header...');
    const response2 = await fetch(`${BASE_URL}/api/test`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    const data2 = await response2.json();
    
    if (response2.ok) {
      console.log('✅ SUCCESS! API key works with x-api-key header too!');
      return true;
    } else {
      console.log(`❌ FAILED with x-api-key header: ${data2.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing with x-api-key header:', error.message);
    return false;
  }
}

// Run tests
(async () => {
  const result1 = await testApiKey();
  const result2 = await testWithXApiKeyHeader();
  
  console.log('');
  if (result1 || result2) {
    console.log('✅ At least one authentication method works!');
    console.log('');
    console.log('💡 You can use your API key in your application like this:');
    console.log('');
    console.log('   // Using Authorization header (recommended)');
    console.log('   fetch("' + BASE_URL + '/api/payments/create", {');
    console.log('     headers: {');
    console.log('       "Authorization": "Bearer ' + API_KEY.substring(0, 20) + '...",');
    console.log('       "Content-Type": "application/json"');
    console.log('     }');
    console.log('   });');
    console.log('');
    console.log('   // Or using x-api-key header');
    console.log('   fetch("' + BASE_URL + '/api/payments/create", {');
    console.log('     headers: {');
    console.log('       "x-api-key": "' + API_KEY.substring(0, 20) + '...",');
    console.log('       "Content-Type": "application/json"');
    console.log('     }');
    console.log('   });');
    process.exit(0);
  } else {
    console.log('❌ API key test failed. Please check:');
    console.log('   1. Your API key is correct');
    console.log('   2. The API key has not been revoked');
    console.log('   3. The server is running and accessible');
    console.log('   4. The BASE_URL is correct (currently: ' + BASE_URL + ')');
    process.exit(1);
  }
})();

