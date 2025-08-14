#!/bin/bash

# Simple smoke test script to validate app functionality
# This can help identify issues without needing full E2E setup

echo "🚀 Starting Soccer Coach App Smoke Test"
echo "========================================"

BASE_URL="http://localhost:3000"
ERRORS=0

# Function to test endpoint
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)
    
    if [ "$response" -eq "$expected_status" ]; then
        echo "✅ PASS ($response)"
    else
        echo "❌ FAIL (expected $expected_status, got $response)"
        ERRORS=$((ERRORS + 1))
    fi
}

# Function to check if app is running
check_app_running() {
    echo "Checking if app is running on $BASE_URL..."
    
    for i in {1..10}; do
        if curl -s "$BASE_URL" > /dev/null 2>&1; then
            echo "✅ App is running on $BASE_URL"
            return 0
        fi
        echo "⏳ Waiting for app to start (attempt $i/10)..."
        sleep 2
    done
    
    echo "❌ App is not responding on $BASE_URL"
    echo "Please start the app with: npm run dev"
    exit 1
}

# Function to check page content
check_page_content() {
    local url=$1
    local expected_text=$2
    local description=$3
    
    echo -n "Checking $description... "
    
    content=$(curl -s "$url" --max-time 10)
    
    if echo "$content" | grep -q "$expected_text"; then
        echo "✅ PASS (found '$expected_text')"
    else
        echo "❌ FAIL (missing '$expected_text')"
        ERRORS=$((ERRORS + 1))
    fi
}

# Check if app is running
check_app_running

echo ""
echo "🧪 Running Endpoint Tests"
echo "========================"

# Test core endpoints
test_endpoint "$BASE_URL" 200 "Homepage"
test_endpoint "$BASE_URL/api/health" 200 "Health endpoint"
test_endpoint "$BASE_URL/api/monitoring/metrics" 200 "Metrics endpoint"
test_endpoint "$BASE_URL/admin/monitoring" 200 "Admin monitoring page"

echo ""
echo "📄 Running Content Tests"
echo "========================"

# Check page content
check_page_content "$BASE_URL" "MatchDay Coach" "App title on homepage"
check_page_content "$BASE_URL" "manifest.json" "PWA manifest link"
check_page_content "$BASE_URL/api/health" "healthy" "Health check status"

echo ""
echo "🔍 Checking for Common Issues"
echo "============================="

# Check for console errors in static files
echo -n "Checking for React hydration issues... "
homepage_content=$(curl -s "$BASE_URL")
if echo "$homepage_content" | grep -q "hydration\|mismatch"; then
    echo "⚠️  WARNING (potential hydration issues found)"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ PASS"
fi

# Check if service worker is registered
echo -n "Checking for service worker registration... "
if echo "$homepage_content" | grep -q "serviceWorker\|sw.js"; then
    echo "✅ PASS"
else
    echo "⚠️  INFO (no service worker found)"
fi

# Check monitoring and error tracking
echo -n "Checking Web Vitals collection... "
metrics_content=$(curl -s "$BASE_URL/api/monitoring/metrics")
if echo "$metrics_content" | grep -q "webVitals"; then
    echo "✅ PASS"
else
    echo "❌ FAIL (Web Vitals not found in metrics)"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "📊 Generating Test Report"
echo "========================"

if [ $ERRORS -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED! App appears to be working correctly."
    echo ""
    echo "✅ Core functionality verified"
    echo "✅ All endpoints responding"
    echo "✅ Content loading properly"
    echo "✅ Monitoring system active"
    echo ""
    echo "🚀 Ready for manual testing!"
    exit 0
else
    echo "⚠️  $ERRORS ISSUES FOUND"
    echo ""
    echo "Issues that need attention:"
    echo "- Check the failed endpoints above"
    echo "- Verify app is properly built and configured"
    echo "- Check server logs for errors"
    echo ""
    echo "📝 Next steps:"
    echo "1. Fix the issues identified above"
    echo "2. Re-run this test: ./scripts/smoke-test.sh"
    echo "3. Once all pass, proceed with full E2E testing"
    exit 1
fi