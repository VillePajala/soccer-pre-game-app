const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Find all test files
const testFiles = execSync('find src -name "*.test.ts" -o -name "*.test.tsx"', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`Found ${testFiles.length} test files\n`);

const results = {
  passing: [],
  failing: [],
  error: []
};

// Test each file individually
testFiles.forEach((file, index) => {
  process.stdout.write(`Testing ${index + 1}/${testFiles.length}: ${path.basename(file)}... `);
  
  try {
    execSync(`npx jest "${file}" --no-coverage --silent`, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    results.passing.push(file);
    console.log('✅ PASS');
  } catch (error) {
    const output = error.stdout || '';
    const stderr = error.stderr || '';
    
    if (output.includes('FAIL') || stderr.includes('FAIL')) {
      results.failing.push(file);
      console.log('❌ FAIL');
    } else {
      results.error.push(file);
      console.log('💥 ERROR');
    }
  }
});

// Summary
console.log('\n=== TEST ANALYSIS SUMMARY ===');
console.log(`✅ Passing: ${results.passing.length}`);
console.log(`❌ Failing: ${results.failing.length}`);
console.log(`💥 Errors: ${results.error.length}`);
console.log(`📊 Total: ${testFiles.length}`);

console.log('\n=== FAILING TESTS ===');
results.failing.forEach(file => console.log(`- ${file}`));

console.log('\n=== ERROR TESTS ===');
results.error.forEach(file => console.log(`- ${file}`));

// Save results
fs.writeFileSync('test-analysis.json', JSON.stringify(results, null, 2));
console.log('\nResults saved to test-analysis.json');