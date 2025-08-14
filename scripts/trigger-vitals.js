// Simple script to trigger Web Vitals collection for testing
// Run this in the browser console on localhost:3000

console.log('🎯 Triggering Web Vitals for testing...');

// Trigger a page reload to get FCP and LCP
setTimeout(() => {
    console.log('📊 Checking Web Vitals after interaction...');
    
    // Check if vitals are being collected
    fetch('/api/monitoring/metrics')
        .then(res => res.json())
        .then(data => {
            const vitals = data.aggregated.webVitals;
            const info = data.aggregated.metricsInfo;
            
            console.log('📈 Current Web Vitals:', {
                hasData: info.hasData,
                totalMeasurements: info.totalMeasurements,
                vitals: Object.entries(vitals)
                    .filter(([, values]) => values.count > 0)
                    .map(([name, values]) => `${name}: ${values.p50}ms (${values.count})`)
            });
        })
        .catch(err => console.error('Failed to fetch metrics:', err));
}, 3000);

// Create some layout shifts to trigger CLS
const div = document.createElement('div');
div.style.height = '100px';
div.style.width = '100px';
div.style.backgroundColor = 'red';
document.body.appendChild(div);

setTimeout(() => {
    div.style.height = '200px'; // This should trigger a layout shift
}, 1000);

setTimeout(() => {
    document.body.removeChild(div);
}, 2000);

console.log('✅ Web Vitals triggers initiated. Check console in 3 seconds for results.');