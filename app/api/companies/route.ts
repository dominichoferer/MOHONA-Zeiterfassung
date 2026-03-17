import { NextResponse } from 'next/server'

// Companies are now fetched directly via Firebase client SDK
// This route is kept for potential future server-side use
export async function GET() {
  return NextResponse.json({ message: 'Use Firebase client SDK directly' }, { status: 200 })
}
