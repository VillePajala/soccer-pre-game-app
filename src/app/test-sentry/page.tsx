'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function TestSentryPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  
  // Disable in production
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 max-w-lg w-full text-center">
          <div className="text-yellow-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-slate-100 mb-4">
            Test Page Disabled
          </h1>
          <p className="text-slate-300 mb-6">
            The Sentry test page is disabled in production for security reasons.
            This page is only available in development environments.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Back to App
          </button>
        </div>
      </div>
    );
  }

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testClientError = () => {
    addResult('Triggering client-side error...');
    throw new Error('Test client-side error from Sentry test page');
  };

  const testAsyncError = async () => {
    addResult('Triggering async error...');
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error('Test async error from Sentry test page');
  };

  const testCaptureMessage = () => {
    addResult('Sending test message to Sentry...');
    Sentry.captureMessage('Test message from Sentry test page', 'info');
    addResult('Message sent!');
  };

  const testCaptureException = () => {
    addResult('Capturing exception manually...');
    try {
      // Intentionally cause an error
      const obj: any = null;
      obj.nonExistentMethod();
    } catch (error) {
      Sentry.captureException(error);
      addResult('Exception captured and sent to Sentry!');
    }
  };

  const testBreadcrumbs = () => {
    addResult('Adding breadcrumbs...');
    
    Sentry.addBreadcrumb({
      message: 'User clicked test button',
      category: 'user-action',
      level: 'info',
    });
    
    Sentry.addBreadcrumb({
      message: 'Test data loaded',
      category: 'data',
      level: 'debug',
      data: { items: 5, source: 'test' },
    });
    
    addResult('Breadcrumbs added (will be included with next error)');
  };

  const testUserContext = () => {
    addResult('Setting user context...');
    
    Sentry.setUser({
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'testuser',
    });
    
    addResult('User context set!');
  };

  const testCustomContext = () => {
    addResult('Setting custom context...');
    
    Sentry.setContext('test_session', {
      testId: 'sentry-test-123',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
    
    Sentry.setTag('test.type', 'manual');
    Sentry.setTag('test.page', 'sentry-test');
    
    addResult('Custom context and tags set!');
  };

  const testTransaction = () => {
    addResult('Starting performance transaction...');
    
    // In newer Sentry versions, use startSpan instead
    Sentry.startSpan(
      { 
        op: 'test',
        name: 'Test Transaction' 
      },
      () => {
        // Simulate some work
        setTimeout(() => {
          addResult('Transaction completed and sent!');
        }, 1000);
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Sentry Integration Test Page</h1>
        <p className="text-slate-400 mb-8">
          Use this page to test that Sentry is properly configured and receiving events.
        </p>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Configuration Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Sentry DSN:</span>
              <span className={`font-mono ${process.env.NEXT_PUBLIC_SENTRY_DSN ? 'text-green-400' : 'text-red-400'}`}>
                {process.env.NEXT_PUBLIC_SENTRY_DSN ? 'Configured' : 'Not configured'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Environment:</span>
              <span className="text-slate-200">{process.env.NODE_ENV}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Version:</span>
              <span className="text-slate-200">{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Test Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={testCaptureMessage}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Send Test Message
            </button>
            
            <button
              onClick={testCaptureException}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors"
            >
              Capture Exception
            </button>
            
            <button
              onClick={testBreadcrumbs}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
            >
              Add Breadcrumbs
            </button>
            
            <button
              onClick={testUserContext}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Set User Context
            </button>
            
            <button
              onClick={testCustomContext}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              Set Custom Context
            </button>
            
            <button
              onClick={testTransaction}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-md transition-colors"
            >
              Test Transaction
            </button>
            
            <button
              onClick={testAsyncError}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors"
            >
              Trigger Async Error
            </button>
            
            <button
              onClick={testClientError}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Trigger Client Error
            </button>
          </div>
        </div>

        {testResults.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-100">Test Results</h2>
              <button
                onClick={() => setTestResults([])}
                className="text-sm text-slate-400 hover:text-slate-300"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1 font-mono text-sm">
              {testResults.map((result, index) => (
                <div key={index} className="text-slate-300">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
          <p className="text-yellow-400 text-sm">
            <strong>Note:</strong> After triggering errors, check your Sentry dashboard to verify they were received.
            Errors may take a few seconds to appear in Sentry.
          </p>
        </div>
      </div>
    </div>
  );
}