import { NextResponse } from 'next/server';
import manifest from '../../manifest';

export async function GET() {
  return NextResponse.json(manifest());
}
