import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const report = await request.json();
    
    // Log CSP violations in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('CSP Violation:', report);
    }
    
    // In production, you might want to send this to a monitoring service
    // like Sentry, LogRocket, or your own logging infrastructure
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing CSP report:', error);
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
  }
}

// Handle other methods gracefully
export async function GET() {
  return NextResponse.json({ message: 'CSP report endpoint' });
}