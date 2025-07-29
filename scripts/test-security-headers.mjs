#!/usr/bin/env node

/**
 * Test script to verify security headers are properly set
 */

import http from 'http';

const testUrl = 'http://localhost:3000';

// Start a test to check headers
console.log('Testing security headers...');

const req = http.get(testUrl, (res) => {
  console.log('\n=== Security Headers Test Results ===');
  console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
  
  const securityHeaders = [
    'x-frame-options',
    'x-content-type-options', 
    'x-xss-protection',
    'referrer-policy',
    'x-powered-by'
  ];
  
  let passCount = 0;
  
  securityHeaders.forEach(header => {
    const value = res.headers[header];
    const exists = value !== undefined;
    const status = exists ? '✅' : '❌';
    
    console.log(`${status} ${header}: ${value || 'NOT SET'}`);
    
    if (exists) passCount++;
  });
  
  console.log(`\nSecurity Headers: ${passCount}/${securityHeaders.length} configured`);
  
  if (passCount === securityHeaders.length) {
    console.log('🎉 All security headers are properly configured!');
    process.exit(0);
  } else {
    console.log('⚠️  Some security headers are missing');
    process.exit(1);
  }
  
}).on('error', (err) => {
  console.error('❌ Error testing headers:', err.message);
  console.log('Make sure the dev server is running: npm run dev');
  process.exit(1);
});

// Timeout after 5 seconds
setTimeout(() => {
  req.destroy();
  console.log('❌ Test timed out - is the server running?');
  process.exit(1);
}, 5000);