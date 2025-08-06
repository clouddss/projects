import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // This endpoint is hit by the bank after 3DS is completed.
  // We can now notify the frontend and resume the puppeteer script.
  console.log('3DS callback received');
  return NextResponse.json({ success: true, message: '3DS verification successful. You can close this window.' });
}