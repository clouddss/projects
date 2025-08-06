import { NextResponse } from 'next/server'

let balance = 1000; // Starting balance

export async function GET() {
  return NextResponse.json({ balance });
}