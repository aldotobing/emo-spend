import { NextResponse } from 'next/server';
import manifest from '../manifest';

export const dynamic = 'force-dynamic';

export async function GET() {
  const manifestData = manifest();
  
  // Set the Content-Type header to application/manifest+json
  const headers = new Headers();
  headers.set('Content-Type', 'application/manifest+json');
  
  return new NextResponse(JSON.stringify(manifestData), {
    status: 200,
    headers
  });
}
