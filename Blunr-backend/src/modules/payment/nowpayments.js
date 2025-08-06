import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

function removeNullFields(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined));
}

export async function createNowPaymentsCharge({
  amount,
  currency,
  orderId,
  successUrl,
  cancelUrl,
  ipn_callback_url,
}) {
  const payload = removeNullFields({
    price_amount: amount,
    price_currency: currency.toLowerCase(),
    ipn_callback_url,
    order_id: orderId, // Now includes encoded metadata
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  console.log("📤 NowPayments payload:", payload);

  try {
    const res = await axios.post(
      "https://api.nowpayments.io/v1/invoice",
      payload,
      {
        headers: {
          "x-api-key": process.env.NOWPAYMENTS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.data || !res.data.invoice_url) {
      console.error("❌ NowPayments error response:", res.data);
      throw new Error("Failed to create NowPayments invoice");
    }

    return res.data;
  } catch (err) {
    console.error("❌ NowPayments call failed:", err.response?.data || err.message);
    throw err;
  }
}
