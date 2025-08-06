import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.CRYPTOMUS_API_KEY;
const MERCHANT_UUID = process.env.CRYPTOMUS_MERCHANT_UUID;

function generateSign(data) {
    const payload = JSON.stringify(data);
    return crypto.createHmac("sha256", API_KEY).update(payload).digest("hex");
}

export async function createCryptomusCharge({ amount, currency, orderId, successUrl, cancelUrl }) {
    const payload = {
        amount,
        currency,
        order_id: orderId,
        url_return: successUrl,
        url_callback: cancelUrl,
    };

    const response = await axios.post(
        process.env.CRYPTOMUS_PAYMENT_URL,
        payload,
        {
            headers: {
                merchant: MERCHANT_UUID,
                sign: generateSign(payload),
                "Content-Type": "application/json",
            },
        }
    );
    return response.data;
}
