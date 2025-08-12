'use client';

import { useEffect } from 'react';
import { reportWebVitals, observePerformance } from '@/lib/monitoring/webVitals';

export default function WebVitalsReporter() {
  useEffect(() => {
    // Start reporting Web Vitals
    reportWebVitals();
    
    // Start observing additional performance metrics
    observePerformance();
  }, []);
  
  return null;
}