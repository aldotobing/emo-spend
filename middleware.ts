import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle requests for site.webmanifest
  if (request.nextUrl.pathname === '/site.webmanifest') {
    return NextResponse.rewrite(new URL('/api/site.webmanifest', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/site.webmanifest', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
