import * as TransactionService from "./transaction.service.js";
import coinbase from "coinbase-commerce-node";
import fetch from "node-fetch"; 
import mongoose from "mongoose";
import crypto from "crypto";
import Message from "../../modules/message/message.model.js";
import Post from "../../modules/posts/post.model.js";
import Subscription from "../../modules/subscription/subscription.model.js";
import Tip from "../../modules/tips/tip.model.js";
import User from "../../modules/user/user.model.js"; 
import { createNowPaymentsCharge } from "../payment/nowpayments.js";
import { createCryptomusCharge } from "../payment/cryptomus.js";
import Wallet from '../wallet/wallet.model.js';
import { v4 as uuidv4 } from "uuid";

const Client = coinbase.Client;
const Charge = coinbase.resources.Charge;

Client.init(process.env.COINBASE_API_KEY);
console.log(process.env.COINBASE_API_KEY, "Coinbase API Key");



export const createTransactionAndChargeController = async (req, res) => {
  try {
    const {
      type,
      amount,
      currency = "USD",
      redirect_url,
      cancel_url,
      redirectUrl,
      cancelUrl,
      postId,
      messageId,
      subscriptionId,
      recipientId,
      gateway = "coinbase",
    } = req.body;

    const userId = req.user?.id;
    if (!type || !amount) return res.status(400).json({ message: "Type and amount are required." });
    if (!userId) return res.status(401).json({ message: "Unauthorized: Missing user ID." });

    const finalRedirectUrl = redirect_url || redirectUrl;
    const finalCancelUrl = cancel_url || cancelUrl;

    const transaction = await TransactionService.createTransaction({
      user: userId,
      type,
      amount: Number(amount),
      currency,
      status: "pending",
      transactionId: new mongoose.Types.ObjectId(),
      recipient: recipientId,
      postId,
      messageId,
      subscriptionId,
    });

    const metadata = {
      transactionId: String(transaction._id),
      type,
      postId,
      messageId,
      subscriptionId,
      recipientId,
      amount,
      currency,
    };

    let chargeData;
    switch (gateway.toLowerCase()) {
      case "coinbase": {
        const coinbaseRes = await fetch("https://api.commerce.coinbase.com/charges", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CC-Api-Key": process.env.COINBASE_API_KEY,
          },
          body: JSON.stringify({
            name: `Payment for ${type}`,
            description: `Transaction ID: ${transaction._id}`,
            redirect_url: finalRedirectUrl,
            cancel_url: finalCancelUrl,
            will_redirect_after_success: true,
            local_price: { amount: Number(amount), currency },
            pricing_type: "fixed_price",
            metadata,
          }),
        });

        chargeData = await coinbaseRes.json();
        break;
      }

      case "nowpayments": {
        const ipnCallbackUrl = "https://backend.blunr.com/api/transaction/nowPayments/webhook";
        const orderId = `txn_${transaction._id}::${type}::${postId || ""}::${messageId || ""}::${subscriptionId || ""}::${recipientId || ""}::${amount}::${currency}`;

        chargeData = await createNowPaymentsCharge({
          amount: Number(amount),
          currency,
          orderId,
          successUrl: finalRedirectUrl,
          cancelUrl: finalCancelUrl,
          ipn_callback_url: ipnCallbackUrl,
        });
        break;
      }

      case "cryptomus": {
        chargeData = await createCryptomusCharge({
          amount: Number(amount),
          currency,
          orderId: `txn_${transaction._id}`,
          successUrl: finalRedirectUrl,
          cancelUrl: finalCancelUrl,
          metadata,
        });
        break;
      }

      default:
        return res.status(400).json({ message: `Unsupported payment gateway: ${gateway}` });
    }

    return res.status(200).json({
      message: "Transaction created successfully",
      transaction,
      charge: chargeData,
    });
  } catch (error) {
    console.error("❌ Error creating transaction and charge:", error);
    return res.status(500).json({ error: error.message || "Something went wrong" });
  }
};


export const createFillUpCheckoutSessionController = async (req, res) => {
  try {
    const {
      type,
      amount,
      currency = "USD",
      postId,
      messageId,
      subscriptionId,
      recipientId,
    } = req.body;

    if (!amount) {
      return res.status(400).json({ message: "Amount is required." });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID." });
    }

    const transactionId = new mongoose.Types.ObjectId();

    const transaction = await TransactionService.createTransaction({
      _id: transactionId,
      user: userId,
      type,
      amount: Number(amount),
      currency,
      status: "pending",
      transactionId, // optional duplicate field for easier querying
      recipient: recipientId,
      postId,
      messageId,
      subscriptionId,
    });

    const successUrl = `https://your-app.com/payment-success?transactionId=${transactionId}`;
    const cancelUrl = `https://your-app.com/payment-cancelled`;

    // Passing metadata via query params
    const redirectUrl = `https://checkout.blunr.com?transactionId=${transactionId}&amount=${amount}&currency=${currency}&postId=${postId || ""}&messageId=${messageId || ""}&subscriptionId=${subscriptionId || ""}&recipientId=${recipientId || ""}&successUrl=${encodeURIComponent(successUrl)}&cancelUrl=${encodeURIComponent(cancelUrl)}`;

    return res.status(200).json({
      message: "Checkout session created",
      redirectUrl,
    });
  } catch (error) {
    console.error("❌ Error creating fill-up checkout session:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const customCryptoWebhookController = async (req, res) => {
  try {
    const {
      transactionId,
      status,
      amount,
      payment_id,
      postId,
      messageId,
      subscriptionId,
      recipientId,
    } = req.body;

    if (!transactionId || !status) {
      return res.status(400).json({ message: "Missing transactionId or status" });
    }

    let newStatus = "pending";
    if (["completed", "success", "confirmed"].includes(status.toLowerCase())) {
      newStatus = "completed";
    } else if (["failed", "cancelled", "expired"].includes(status.toLowerCase())) {
      newStatus = "failed";
    }

    // Step 1: Update transaction
    const updatedTransaction = await TransactionService.updateTransaction(transactionId, {
      status: newStatus,
      paymentGatewayId: payment_id,
    });

    if (!updatedTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    console.log("✅ Transaction updated:", updatedTransaction);

    // Step 2: Side effects
    if (newStatus === "completed") {
      if (postId) {
        await Post.findByIdAndUpdate(postId, { isLocked: false });
        console.log(`📬 Post ${postId} unlocked`);
      }

      if (messageId) {
        await Message.findByIdAndUpdate(messageId, { isLocked: false });
        console.log(`📨 Message ${messageId} unlocked`);
      }

      if (subscriptionId) {
        await Subscription.findByIdAndUpdate(subscriptionId, { status: "active" });
        console.log(`📅 Subscription ${subscriptionId} activated`);
      }

      if (recipientId && amount > 0) {
        const updatedWallet = await Wallet.findOneAndUpdate(
          { user: recipientId },
          { $inc: { balance: amount } },
          { new: true }
        );

        if (!updatedWallet) {
          console.error(`❌ Wallet not found for user ${recipientId}`);
        } else {
          console.log(`✅ Wallet updated for ${recipientId}. New balance: ${updatedWallet.balance}`);
        }
      }
    }

    return res.status(200).json({ message: "Payment processed successfully" });
  } catch (error) {
    console.error("❌ Error in custom crypto webhook:", error);
    return res.status(500).json({ message: error.message });
  }
};


export const nowPaymentsWebhook = async (req, res) => {
  try {
    const data = req.body;

    console.log("🔔 NowPayments Webhook Received:", JSON.stringify(data, null, 2));

    const status = data.payment_status || "unknown";
    const orderId = data.order_id || "";

    // ✅ Split the order_id
    if (!orderId.startsWith("txn_")) {
      console.error("❌ Invalid order_id format:", orderId);
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    const rawOrderId = orderId.replace("txn_", "");
    const parts = rawOrderId.split("::");

    const transactionId = parts[0]; // ✅ Actual MongoDB ObjectId
    const type = parts[1] || null;
    const postId = parts[2] || null;
    const messageId = parts[3] || null;
    const subscriptionId = parts[4] || null;
    const recipientId = parts[5] || null;
    const amount = parseFloat(parts[6]) || 0;
    const currency = parts[7] || "USD";

    console.log(`📥 NowPayments Status: ${status}`);
    console.log(`📦 Parsed from order_id:
      transactionId = ${transactionId},
      type = ${type},
      postId = ${postId},
      messageId = ${messageId},
      subscriptionId = ${subscriptionId},
      recipientId = ${recipientId},
      amount = ${amount},
      currency = ${currency}
    `);

    // Internal status mapping
    let newStatus = "pending";
    if (["finished", "confirmed", "partially_paid"].includes(status)) {
      newStatus = "completed";
    } else if (["expired", "cancelled", "failed"].includes(status)) {
      newStatus = "failed";
    }

    console.log(`🔁 Mapped NowPayments status '${status}' to internal status '${newStatus}'`);

    // ✅ Use parsed transactionId (not full order_id)
    if (transactionId) {
      const updatedTransaction = await TransactionService.updateTransaction(transactionId, {
        status: newStatus,
        paymentGatewayId: data.payment_id,
      });
      console.log("✅ Transaction updated:", updatedTransaction);
    }

    // Handle side effects for completed payments
    if (newStatus === "completed") {
      if (postId) {
        await Post.findByIdAndUpdate(postId, { isLocked: false }, { new: true });
        console.log(`📬 Post ${postId} unlocked.`);
      }

      if (messageId) {
        await Message.findByIdAndUpdate(messageId, { isLocked: false }, { new: true });
        console.log(`📨 Message ${messageId} unlocked.`);
      }

      if (subscriptionId) {
        await Subscription.findByIdAndUpdate(subscriptionId, { status: "active" }, { new: true });
        console.log(`📅 Subscription ${subscriptionId} activated.`);
      }

    if (recipientId && amount > 0) {
      const updatedWallet = await Wallet.findOneAndUpdate(
        { user: recipientId },
        { $inc: { balance: amount } },
        { new: true }
      );

      if (!updatedWallet) {
        console.error(`❌ Wallet not found for user ${recipientId}`);
      } else {
        console.log(`✅ Wallet updated for ${recipientId}. New balance: ${updatedWallet.balance}`);
      }
    }

    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ NowPayments Webhook Error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const coinbaseWebhook = async (req, res) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers["x-cc-webhook-signature"];

    console.log("🔔 Coinbase Webhook Raw Body:", rawBody);
    console.log("🔐 Signature:", signature);

    if (!signature) {
      return res.status(400).json({ message: "Missing signature" });
    }

    const hmac = crypto
      .createHmac("sha256", process.env.COINBASE_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (hmac !== signature) {
      console.warn(`❌ Invalid signature. Expected: ${hmac}`);
      return res.status(400).json({ message: "Invalid signature" });
    }

    const { event } = req.body;
    const { id: chargeId, timeline, metadata, payments } = event.data;
    const status = timeline[timeline.length - 1]?.status || "UNKNOWN";

    const transactionId = metadata.transaction_id;
    const postId = metadata.postId;
    const messageId = metadata.messageId;
    const subscriptionId = metadata.subscriptionId;
    const recipientId = metadata.recipientId;
    const amount = parseFloat(metadata.amount) || 0;
    const currency = metadata.currency || "USD";

    console.log(`📥 Coinbase Event Type: ${event.type}`);
    console.log(`📌 Charge Status: ${status}`);

    // Determine internal status
    let newStatus = "pending";
    if (["CONFIRMED", "COMPLETED", "RESOLVED"].includes(status)) {
      newStatus = "completed";
    } else if (["FAILED", "EXPIRED", "CANCELED"].includes(status)) {
      newStatus = "failed";
    } else if (["PENDING", "PROCESSING"].includes(status)) {
      newStatus = "pending";
    }

    console.log(`🔁 Mapped Status: ${newStatus}`);

    // Update transaction
    if (transactionId) {
      const updatedTransaction = await TransactionService.updateTransaction(transactionId, {
        status: newStatus,
        paymentGatewayId: chargeId,
      });
      console.log("✅ Transaction updated:", updatedTransaction);
    }

    // Handle success flow
    if (newStatus === "completed") {
      if (postId) {
        await Post.findByIdAndUpdate(postId, { isLocked: false }, { new: true });
        console.log(`📬 Post ${postId} unlocked.`);
      }

      if (messageId) {
        await Message.findByIdAndUpdate(messageId, { isLocked: false }, { new: true });
        console.log(`📨 Message ${messageId} unlocked.`);
      }

      if (subscriptionId) {
        await Subscription.findByIdAndUpdate(subscriptionId, { status: "active" }, { new: true });
        console.log(`📅 Subscription ${subscriptionId} activated.`);
      }

      if (recipientId) {
        await User.findByIdAndUpdate(recipientId, {
          $inc: { "wallet.balance": amount },
        });
        console.log(`💰 Recipient ${recipientId} credited with ${amount} ${currency}`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Coinbase Webhook Error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const cryptomusWebhook = async (req, res) => {
    try {
        const data = req.body;
        console.log("🔔 Cryptomus Webhook Received:", JSON.stringify(data, null, 2));

        const metadata = data.order?.metadata || {};
        const status = data.status;

        const {
            transaction_id: transactionId,
            postId,
            messageId,
            subscriptionId,
            recipientId,
            amount: rawAmount,
            currency = "USD"
        } = metadata;

        const amount = parseFloat(rawAmount) || 0;

        const newStatus = ["paid", "completed", "confirmed"].includes(status) ? "completed"
                          : ["cancelled", "expired", "failed"].includes(status) ? "failed"
                          : "pending";

        console.log(`🔄 Mapping Cryptomus status '${status}' to internal status '${newStatus}'`);
        console.log(`📌 Metadata: transactionId=${transactionId}, postId=${postId}, messageId=${messageId}, subscriptionId=${subscriptionId}, recipientId=${recipientId}, amount=${amount} ${currency}`);

        if (transactionId) {
            const updatedTransaction = await TransactionService.updateTransaction(transactionId, {
                status: newStatus,
                paymentGatewayId: data.uuid,
            });
            console.log("✅ Transaction updated:", updatedTransaction);
        }

        if (newStatus === "completed") {
            if (postId) console.log(`📬 Unlocking post: ${postId}`);
            if (messageId) console.log(`📨 Unlocking message: ${messageId}`);
            if (subscriptionId) console.log(`📅 Activating subscription: ${subscriptionId}`);
            if (recipientId) console.log(`💵 Crediting recipient: ${recipientId} with ${amount} ${currency}`);

            if (postId) await Post.findByIdAndUpdate(postId, { isLocked: false });
            if (messageId) await Message.findByIdAndUpdate(messageId, { isLocked: false });
            if (subscriptionId) await Subscription.findByIdAndUpdate(subscriptionId, { status: "active" });
            if (recipientId) await User.findByIdAndUpdate(recipientId, { $inc: { "wallet.balance": amount } });
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error("❌ Cryptomus webhook error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const getTransactionByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await TransactionService.getTransactionById(id);

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getUserTransactionsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const transactions = await TransactionService.getUserTransactions(userId);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateTransactionStatusController = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updatedTransaction = await TransactionService.updateTransactionStatus(id, status);

        if (!updatedTransaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.json({ message: "Transaction status updated", transaction: updatedTransaction });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
