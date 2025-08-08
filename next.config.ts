import type { NextConfig } from "next";

// Bundle analyzer for performance optimization
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Remove X-Powered-By header
  poweredByHeader: false,
  
  // Disable TypeScript checking during build - we handle this separately in CI
  typescript: {
    // Keep strict in CI; allow local dev to proceed
    ignoreBuildErrors: process.env.CI ? false : true,
  },
  
  // During migration, treat ESLint warnings as warnings, not build errors
  eslint: {
    // Only run ESLint on pages and src directories during build
    dirs: ['pages', 'src'],
    // Don't fail builds in local dev, but enforce in CI
    ignoreDuringBuilds: process.env.CI ? false : true,
  },
  
  // Security headers configuration
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          // Prevent clickjacking attacks
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Enable XSS filtering
          // Note: X-XSS-Protection is deprecated; modern browsers ignore it
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Enhanced Content Security Policy for production security
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Restrict scripts - remove unsafe-eval, minimize unsafe-inline
              "script-src 'self' https://vercel.live https://va.vercel-scripts.com" + 
              (process.env.NODE_ENV === 'development' ? " 'unsafe-eval' 'unsafe-inline'" : " 'unsafe-inline'"),
              // Styles - keep minimal inline for Tailwind
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Fonts from Google Fonts and data URIs
              "font-src 'self' https://fonts.gstatic.com data:",
              // Images from self, data URIs, blobs, and HTTPS
              "img-src 'self' data: blob: https:",
              // API connections to Supabase and analytics
              "connect-src 'self' https://*.supabase.co https://vercel.live https://vitals.vercel-insights.com",
              // Service Worker
              "worker-src 'self'",
              // Manifest for PWA
              "manifest-src 'self'",
              // No frames, objects, plugins
              "frame-src 'self' https://vercel.live",
              "object-src 'none'",
              // Restrict base URI and form actions
              "base-uri 'self'",
              "form-action 'self'",
              // Prevent embedding in frames
              "frame-ancestors 'none'",
              // Report violations (optional)
              "report-uri /api/csp-report"
            ].join('; ')
          },
          // Strict Transport Security (HSTS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          // CORS and additional security headers
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), usb=()'
          },
          // Relax COEP only if required; otherwise omit to avoid cross-origin issues
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups'
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin'
          }
        ]
      }
    ];
  }
};

export default withBundleAnalyzer(nextConfig);
