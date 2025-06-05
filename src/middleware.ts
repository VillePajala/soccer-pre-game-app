import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

// Protect all routes except the public ones
export default clerkMiddleware(async (auth, req) => {
  console.log('Middleware running for path:', req.nextUrl.pathname);
  console.log('Is public route:', isPublicRoute(req));
  
  if (!isPublicRoute(req)) {
    console.log('Protecting route, checking auth...');
    await auth.protect();
  }
}, { debug: true });

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 