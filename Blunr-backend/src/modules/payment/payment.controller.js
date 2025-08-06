import fetch from "node-fetch"; // only needed for Coinbase
import { createNowPaymentsCharge } from "../services/nowpayments.js";
import { createCryptomusCharge } from "../services/cryptomus.js";
import { v4 as uuidv4 } from "uuid";



async function createCoinbaseCharge({ amount, user_id }) {
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CC-Api-Key': process.env.COINBASE_API_KEY
        },
        body: JSON.stringify({
            name: "Order Payment",
            local_price: { amount, currency: 'USD' },
            pricing_type: 'fixed_price',
            metadata: { user_id }
        }),
    };

    const response = await fetch('https://api.commerce.coinbase.com/charges', options);
    const data = await response.json();
    return data;
}

export const CreateCharge = async (req, res) => {
    try {
        const {
            amount,
            currency = "USD",
            orderId,
            user_id,
            successUrl = "hhttps://blunr.com/success",
            cancelUrl = "https://blunr.com/fail",
            gateway
        } = req.body;

        // ✅ Fallback: generate orderId if not provided
        const generatedOrderId = orderId || `order_${uuidv4().slice(0, 8)}`;

        let response;

        switch (gateway) {
            case "card": 

           location.replace = "http://localhost:3000"

            break;
            case "coinbase":
                response = await createCoinbaseCharge({ amount, user_id });
                break;

            case "nowpayments":
                response = await createNowPaymentsCharge({
                    amount,
                    currency,
                    orderId: generatedOrderId,
                    successUrl,
                    cancelUrl
                });
                break;

            case "cryptomus":
                response = await createCryptomusCharge({
                    amount,
                    currency,
                    orderId: generatedOrderId,
                    successUrl,
                    cancelUrl
                });
                break;

            default:
                return res.status(400).json({ error: "Unsupported payment gateway" });
        }

        res.status(200).json({
            success: true,
            data: response,
            orderId: generatedOrderId 
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

