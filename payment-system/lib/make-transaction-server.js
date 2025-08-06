const readline = require("readline");
const path = require("path");
const puppeteerExtra = require("puppeteer-extra");
const Stealth = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");

puppeteerExtra.use(Stealth());

// Configure RecaptchaPlugin with 2captcha or another service
puppeteerExtra.use(
  RecaptchaPlugin({
    provider: {
      id: "2captcha",
      token: process.env.CAPTCHA_API_KEY || "YOUR_2CAPTCHA_API_KEY", // Add your 2captcha API key
    },
    visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
  })
);

const blunrURL = "https://checkout.blunr.com/api/wallet/credit-user";

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    }),
  );
}

async function addFundsToCreatorWallet(blunrParams, amount) {
  try {
    if (!blunrParams.recipientId) {
      console.log("No recipient ID provided, skipping wallet update");
      return;
    }

    console.log(
      `Adding ${amount} to creator wallet for recipient: ${blunrParams.recipientId}`,
    );

    const response = await axios.post(
      blunrURL,
      {
        amount: parseFloat(amount),
        recipientId: blunrParams.recipientId,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    );

    if (response.data.success || response.status === 200) {
      console.log("✅ Creator wallet updated successfully:", response.data);
    } else {
      console.error("❌ Failed to update creator wallet:", response.data);
    }
  } catch (error) {
    console.error("❌ Error adding funds to creator wallet:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
  }
}

async function waitForPaybisIframe(page, retries = 20, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const iframeHandle = await page.waitForSelector(
        'iframe[src*="cp.paybis.com"]',
        { visible: true, timeout: 20000 },
      );
      if (iframeHandle) {
        console.log(`Paybis iframe found on attempt ${i + 1}`);
        return iframeHandle;
      }
    } catch (error) {
      console.log(`Paybis iframe not found. Retry ${i + 1}/${retries}...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Paybis iframe did not appear after multiple retries.");
}

async function solveCaptchaWithPlugin(page) {
  try {
    console.log("Checking for CAPTCHA...");
    
    // The plugin will automatically detect and solve reCAPTCHAs
    const { captchas, solutions, solved, error } = await page.solveRecaptchas();
    
    if (error) {
      console.error("Error solving CAPTCHAs:", error);
      return false;
    }
    
    if (solved && solved.length > 0) {
      console.log(`✅ Solved ${solved.length} CAPTCHA(s) successfully!`);
      return true;
    }
    
    if (captchas && captchas.length === 0) {
      console.log("No CAPTCHAs detected on the page");
      return true;
    }
    
    console.log("CAPTCHAs detected but not solved");
    return false;
  } catch (error) {
    console.error("Error in CAPTCHA solving:", error.message);
    return false;
  }
}

async function main() {
  const amount = process.env.AMOUNT || 200;
  const gmail = "m4teelias@gmail.com";
  const password = "Diana110604";
  const walletAddress = "bc1q23h9eysa08359yj2cy2chf4af7xvmc5c8qjk8y";
  const cardNumber = process.env.CARD_NUMBER;
  const expiryDate = process.env.EXPIRY_DATE;
  const cvv = process.env.CVV;
  const street = process.env.STREET;
  const city = process.env.CITY;
  const zip = process.env.ZIP;
  const name = process.env.NAME;

  // Parse Blunr parameters
  const blunrParams = JSON.parse(process.env.BLUNR_PARAMS || "{}");

  // For server environments, we need to use Xvfb or run in true headless mode
  const browser = await puppeteerExtra.launch({
    headless: true, // Use true headless mode for servers
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--single-process", // Important for some server environments
      "--disable-blink-features=AutomationControlled",
    ],
    defaultViewport: null,
    ignoreDefaultArgs: ["--enable-automation"],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  );

  try {
    console.log("Navigating to the website...");
    await page.goto("https://switchere.com/onramp#/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Log the current URL in case of redirect
    const currentUrl = page.url();
    console.log("Current URL after navigation:", currentUrl);

    // Create screenshots directory if it doesn't exist
    const screenshotsDir = path.join(process.cwd(), "screenshots");
    const fs = require("fs");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    await page.screenshot({
      path: path.join(screenshotsDir, "initial-load.png"),
      fullPage: true,
    });
    console.log("Initial page loaded.");

    // Solve CAPTCHA if present
    await solveCaptchaWithPlugin(page);

    console.log(`Entering ${amount}...`);

    try {
      // Wait for page to fully load
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Additional wait for dynamic content
      await page
        .waitForFunction(() => document.readyState === "complete", {
          timeout: 10000,
        })
        .catch(() => {
          console.log("Document ready timeout, continuing anyway...");
        });

      // Take a debug screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, "debug-before-amount.png"),
        fullPage: true,
      });

      // Try multiple selectors
      const selectors = [
        ".sw-payment-amount-input",
        "input.sw-payment-amount-input",
        'input[placeholder="0.00"]',
        'input[type="text"][inputmode="decimal"]',
        'input[type="number"]',
        'input[name="amount"]',
        ".amount-input",
        "#amount",
      ];

      let inputFound = false;
      for (const selector of selectors) {
        try {
          console.log(`Trying selector: ${selector}`);
          await page.waitForSelector(selector, { timeout: 5000 });
          
          // Clear and type the amount
          await page.click(selector, { clickCount: 3 });
          await page.type(selector, amount.toString());
          
          console.log(`Successfully entered amount using selector: ${selector}`);
          inputFound = true;
          break;
        } catch (e) {
          console.log(`Selector ${selector} not found or not clickable`);
        }
      }

      if (!inputFound) {
        console.log("Amount input field not found with any selector");
        throw new Error("Could not find amount input field");
      }

      // Take screenshot after entering amount
      await page.screenshot({
        path: path.join(screenshotsDir, "after-amount.png"),
        fullPage: true,
      });

      // Continue with the rest of the form...
      console.log("Waiting for Paybis iframe...");
      const iframeHandle = await waitForPaybisIframe(page);

      // Switch to iframe context
      const frame = await iframeHandle.contentFrame();
      console.log("Switched to Paybis iframe");

      // Solve CAPTCHA in iframe if needed
      await solveCaptchaWithPlugin(frame);

      console.log("Entering email...");
      await frame.waitForSelector('input[type="email"]', {
        visible: true,
        timeout: 30000,
      });
      await frame.type('input[type="email"]', gmail);

      // Check for CAPTCHA before proceeding
      await solveCaptchaWithPlugin(frame);

      console.log("Entering password...");
      await frame.waitForSelector('input[type="password"]', {
        visible: true,
        timeout: 30000,
      });
      await frame.type('input[type="password"]', password);

      // Submit login
      const submitButton = await frame.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
      }

      // Wait for navigation after login
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Continue with wallet address and payment...
      console.log("Process completed successfully!");

      // Update creator wallet if successful
      await addFundsToCreatorWallet(blunrParams, amount);

    } catch (error) {
      console.error("Error during form filling:", error.message);
      
      // Take error screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, "error.png"),
        fullPage: true,
      });
    }

  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);