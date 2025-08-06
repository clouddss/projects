import { NextResponse } from 'next/server'

let balance = 1000; // Starting balance

export async function POST(request: Request) {
  const { amount, currency, cardDetails } = await request.json();

  if (!amount || !currency || !cardDetails || !cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  const formattedCardNumber = cardDetails.cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
  console.log(`Processing payment for ${amount} ${currency} with card number ${formattedCardNumber}`);

  balance += parseInt(amount, 10);

  return NextResponse.json({ success: true, message: 'Payment successful' });
}