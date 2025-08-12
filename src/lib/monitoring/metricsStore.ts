// Simple in-memory store for metrics data
// In production, this would be a database

interface WebVitalData {
  name: string;
  value: number;
  timestamp: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType?: string;
}

interface MetricsData {
  webVitals: WebVitalData[];
  lastUpdated: number;
}

class MetricsStore {
  private data: MetricsData = {
    webVitals: [],
    lastUpdated: Date.now()
  };

  // Add a new Web Vital measurement
  addWebVital(vital: WebVitalData) {
    console.log(`📊 [Metrics Store] Storing vital: ${vital.name} = ${vital.value}`);
    
    // Keep only the last 100 measurements per metric
    this.data.webVitals.push(vital);
    
    // Remove old measurements (keep last 100 per metric type)
    const vitalsByName = this.data.webVitals.reduce((acc, v) => {
      if (!acc[v.name]) acc[v.name] = [];
      acc[v.name].push(v);
      return acc;
    }, {} as Record<string, WebVitalData[]>);

    // Keep only the most recent 100 measurements per metric
    this.data.webVitals = Object.entries(vitalsByName)
      .flatMap(([name, vitals]) => 
        vitals
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 100)
      );
    
    this.data.lastUpdated = Date.now();
    
    console.log(`📈 [Metrics Store] Total vitals stored: ${this.data.webVitals.length}`);
  }

  // Get aggregated Web Vitals for the last 24 hours
  getWebVitalsAggregated() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const recentVitals = this.data.webVitals.filter(
      v => v.timestamp > oneDayAgo
    );

    const aggregated: Record<string, { p50: number | null; p75: number | null; p95: number | null; count: number }> = {
      lcp: { p50: null, p75: null, p95: null, count: 0 },
      fid: { p50: null, p75: null, p95: null, count: 0 },
      cls: { p50: null, p75: null, p95: null, count: 0 },
      ttfb: { p50: null, p75: null, p95: null, count: 0 },
      fcp: { p50: null, p75: null, p95: null, count: 0 },
      inp: { p50: null, p75: null, p95: null, count: 0 },
    };

    // Group by metric name
    const vitalsByName = recentVitals.reduce((acc, vital) => {
      const key = vital.name.toLowerCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(vital.value);
      return acc;
    }, {} as Record<string, number[]>);

    // Calculate percentiles for each metric
    Object.entries(vitalsByName).forEach(([name, values]) => {
      if (values.length === 0) return;
      
      const sorted = values.sort((a, b) => a - b);
      const count = sorted.length;
      
      if (aggregated[name]) {
        aggregated[name].count = count;
        aggregated[name].p50 = getPercentile(sorted, 0.5);
        aggregated[name].p75 = getPercentile(sorted, 0.75);
        aggregated[name].p95 = getPercentile(sorted, 0.95);
      }
    });

    return aggregated;
  }

  // Get current metrics summary
  getMetricsSummary() {
    return {
      totalWebVitals: this.data.webVitals.length,
      lastUpdated: this.data.lastUpdated,
      hasData: this.data.webVitals.length > 0
    };
  }

  // Clear old data (cleanup method)
  cleanup() {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.data.webVitals = this.data.webVitals.filter(
      v => v.timestamp > oneWeekAgo
    );
  }
}

// Helper function to calculate percentiles
function getPercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  if (sortedArray.length === 1) return sortedArray[0];
  
  const index = (percentile * (sortedArray.length - 1));
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  
  if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
  
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

// Export singleton instance
export const metricsStore = new MetricsStore();

// Export types
export type { WebVitalData, MetricsData };