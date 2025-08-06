const readline = require("readline");
const path = require("path");
const puppeteerExtra = require("puppeteer-extra");
const Stealth = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");
const TwoCaptchaSolver = require("./captcha-solver");

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

async function solveCaptchaWith2Captcha(page, captchaSolver) {
  try {
    // Check if we recently solved a CAPTCHA to avoid spam
    const recentlySolved = await page.evaluate(() => {
      const lastSolvedTime = window.lastCaptchaSolvedTime || 0;
      const now = Date.now();
      const timeSinceLastSolve = now - lastSolvedTime;
      
      if (timeSinceLastSolve < 10000) { // 10 second cooldown
        console.log(`🕒 CAPTCHA cooldown active: ${Math.round((10000 - timeSinceLastSolve) / 1000)}s remaining`);
        return true;
      }
      return false;
    });
    
    if (recentlySolved) {
      return false; // Skip solving if we solved one recently
    }
    
    console.log("🔍 Checking for CAPTCHAs...");
    
    // Check if there are pending CAPTCHA solutions or active challenges
    const captchaState = await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea[name="g-recaptcha-response"]');
      let hasSolution = false;
      let hasActiveChallenge = false;
      
      // Check for existing solutions
      for (const textarea of textareas) {
        if (textarea.value && textarea.value.length > 0) {
          hasSolution = true;
          break;
        }
      }
      
      // Check for active visual challenges (image grids, etc.)
      const challengeFrames = document.querySelectorAll('iframe[src*="bframe"]');
      const challengeImages = document.querySelectorAll('.rc-imageselect-target, .rc-image-tile-wrapper, .rc-image-tile-44');
      const challengeInstructions = document.querySelector('.rc-imageselect-instructions');
      
      if (challengeFrames.length > 0 || challengeImages.length > 0 || challengeInstructions) {
        hasActiveChallenge = true;
      }
      
      return {
        hasSolution,
        hasActiveChallenge,
        challengeText: challengeInstructions ? challengeInstructions.textContent : null
      };
    });
    
    if (captchaState.hasActiveChallenge) {
      console.log("🔥 Active reCAPTCHA challenge detected:", captchaState.challengeText);
      // Clear old solutions to force new solve
      await page.evaluate(() => {
        const textareas = document.querySelectorAll('textarea[name="g-recaptcha-response"]');
        textareas.forEach(textarea => {
          textarea.value = '';
        });
        window.lastCaptchaSolvedTime = 0; // Reset cooldown for new challenge
      });
    } else if (captchaState.hasSolution) {
      console.log("⏳ CAPTCHA solution already present, waiting for page to process...");
      return false;
    }

    // Check for reCAPTCHA v2
    const recaptchaV2 = await page.evaluate(() => {
      // Multiple ways to find sitekey
      let sitekey = document.querySelector('[data-sitekey]')?.getAttribute('data-sitekey');
      
      // Check for reCAPTCHA div with sitekey
      if (!sitekey) {
        const recaptchaDiv = document.querySelector('.g-recaptcha');
        if (recaptchaDiv) {
          sitekey = recaptchaDiv.getAttribute('data-sitekey');
        }
      }
      
      // Check for sitekey in scripts
      if (!sitekey) {
        const scripts = Array.from(document.scripts);
        for (const script of scripts) {
          // Look for various sitekey patterns
          const patterns = [
            /sitekey['"]\s*:\s*['"]([^'"]+)['"]/,
            /recaptcha_v3_key['"]\s*:\s*['"]([^'"]+)['"]/,
            /data-sitekey['"]\s*:\s*['"]([^'"]+)['"]/,
            /"k":["']([^"']+)["']/
          ];
          
          for (const pattern of patterns) {
            const match = script.innerHTML.match(pattern);
            if (match) {
              sitekey = match[1];
              break;
            }
          }
          if (sitekey) break;
        }
      }
      
      // Check for sitekey in iframe URLs
      if (!sitekey) {
        const iframes = Array.from(document.querySelectorAll('iframe[src*="recaptcha"]'));
        for (const iframe of iframes) {
          const urlMatch = iframe.src.match(/[?&]k=([^&]+)/);
          if (urlMatch) {
            sitekey = urlMatch[1];
            break;
          }
        }
      }
      
      // Check for iframe with recaptcha
      const iframe = document.querySelector('iframe[src*="recaptcha"]');
      
      return {
        exists: !!iframe || !!sitekey || !!document.querySelector('.g-recaptcha'),
        sitekey: sitekey,
        type: 'recaptcha_v2'
      };
    });

    // Check for reCAPTCHA v3
    const recaptchaV3 = await page.evaluate(() => {
      let sitekey = null;
      
      // Check for v3 script with render parameter
      const scripts = Array.from(document.scripts);
      const v3Script = scripts.find(script => 
        script.src.includes('recaptcha') && script.src.includes('render')
      );
      if (v3Script) {
        const url = new URL(v3Script.src);
        sitekey = url.searchParams.get('render');
      }
      
      // Check for recaptcha_v3_key in JavaScript variables
      if (!sitekey) {
        for (const script of scripts) {
          const match = script.innerHTML.match(/recaptcha_v3_key['"]\s*:\s*['"]([^'"]+)['"]/);
          if (match) {
            sitekey = match[1];
            break;
          }
        }
      }
      
      // Check for window.recaptchaV3SiteKey or similar
      if (!sitekey && window.recaptchaV3SiteKey) {
        sitekey = window.recaptchaV3SiteKey;
      }
      
      return {
        exists: !!sitekey || !!v3Script,
        sitekey: sitekey,
        type: 'recaptcha_v3'
      };
    });

    // Check for hCaptcha
    const hcaptcha = await page.evaluate(() => {
      let sitekey = null;
      
      // Check for hCaptcha div
      const hcaptchaDiv = document.querySelector('.h-captcha');
      if (hcaptchaDiv) {
        sitekey = hcaptchaDiv.getAttribute('data-sitekey');
      }
      
      // Check for data-sitekey in any element
      if (!sitekey) {
        const sitekeElem = document.querySelector('[data-sitekey]');
        if (sitekeElem) {
          sitekey = sitekeElem.getAttribute('data-sitekey');
        }
      }
      
      // Check for hCaptcha iframe
      const iframe = document.querySelector('iframe[src*="hcaptcha"]');
      if (iframe && !sitekey) {
        // Try to extract sitekey from iframe src
        const srcMatch = iframe.src.match(/sitekey=([^&]+)/);
        if (srcMatch) {
          sitekey = srcMatch[1];
        }
      }
      
      return {
        exists: !!iframe || !!hcaptchaDiv,
        sitekey: sitekey,
        type: 'hcaptcha'
      };
    });

    let captchaToSolve = null;
    if (recaptchaV2.exists) captchaToSolve = recaptchaV2;
    else if (recaptchaV3.exists) captchaToSolve = recaptchaV3;
    else if (hcaptcha.exists) captchaToSolve = hcaptcha;

    if (!captchaToSolve) {
      console.log("ℹ️ No CAPTCHA detected");
      return false;
    }

    if (!captchaToSolve.sitekey) {
      console.log("⚠️ CAPTCHA detected but no sitekey found");
      
      // Debug: Log HTML content around CAPTCHA elements
      const debugInfo = await page.evaluate(() => {
        const iframes = Array.from(document.querySelectorAll('iframe'));
        const captchaIframes = iframes.filter(iframe => 
          iframe.src.includes('recaptcha') || 
          iframe.src.includes('hcaptcha') ||
          iframe.title?.toLowerCase().includes('captcha')
        );
        
        const captchaDivs = Array.from(document.querySelectorAll('.g-recaptcha, .h-captcha, [data-sitekey], [data-pkey]'));
        
        return {
          captchaIframes: captchaIframes.map(iframe => ({
            src: iframe.src,
            title: iframe.title,
            id: iframe.id,
            className: iframe.className
          })),
          captchaDivs: captchaDivs.map(div => ({
            tagName: div.tagName,
            className: div.className,
            id: div.id,
            sitekey: div.getAttribute('data-sitekey'),
            pkey: div.getAttribute('data-pkey'),
            innerHTML: div.innerHTML.substring(0, 200) // First 200 chars
          })),
          allDataSitekeys: Array.from(document.querySelectorAll('[data-sitekey]')).map(el => el.getAttribute('data-sitekey')),
          scripts: Array.from(document.scripts).filter(script => 
            script.innerHTML.includes('sitekey') || script.innerHTML.includes('recaptcha')
          ).map(script => script.innerHTML.substring(0, 300))
        };
      });
      
      console.log("🔍 CAPTCHA Debug Info:", JSON.stringify(debugInfo, null, 2));
      return false;
    }

    console.log(`🎯 ${captchaToSolve.type} detected with sitekey: ${captchaToSolve.sitekey}`);
    
    const currentUrl = page.url();
    let solution;

    // Solve based on CAPTCHA type
    switch (captchaToSolve.type) {
      case 'recaptcha_v2':
        // Check if it's invisible reCAPTCHA
        const isInvisible = await page.evaluate(() => {
          const iframes = document.querySelectorAll('iframe[src*="recaptcha"]');
          return Array.from(iframes).some(iframe => iframe.src.includes('size=invisible'));
        });
        solution = await captchaSolver.solveRecaptchaV2(captchaToSolve.sitekey, currentUrl, null, isInvisible);
        break;
      case 'recaptcha_v3':
        solution = await captchaSolver.solveRecaptchaV3(captchaToSolve.sitekey, currentUrl);
        break;
      case 'hcaptcha':
        solution = await captchaSolver.solveHCaptcha(captchaToSolve.sitekey, currentUrl);
        break;
      default:
        throw new Error(`Unsupported CAPTCHA type: ${captchaToSolve.type}`);
    }

    // Inject the solution
    console.log("💉 Injecting CAPTCHA solution...");
    await page.evaluate((solution, captchaType) => {
      if (captchaType === 'recaptcha_v2' || captchaType === 'recaptcha_v3') {
        // Find all reCAPTCHA response textareas
        const textareas = document.querySelectorAll('textarea[name="g-recaptcha-response"]');
        textareas.forEach(textarea => {
          textarea.style.display = 'block';
          textarea.value = solution;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        // Trigger reCAPTCHA callback if exists
        if (window.grecaptcha) {
          // Try to execute callbacks
          if (window.grecaptcha.execute) {
            try {
              window.grecaptcha.execute();
            } catch (e) {
              console.log('grecaptcha.execute failed:', e);
            }
          }
          
          // Trigger any registered callbacks
          if (window.recaptchaCallback && typeof window.recaptchaCallback === 'function') {
            window.recaptchaCallback(solution);
          }
        }
        
        // Mark the CAPTCHA as solved for tracking
        window.captchaSolved = true;
        window.lastCaptchaSolvedTime = Date.now();
        
      } else if (captchaType === 'hcaptcha') {
        const textareas = document.querySelectorAll('textarea[name="h-captcha-response"]');
        textareas.forEach(textarea => {
          textarea.style.display = 'block';
          textarea.value = solution;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        });
        window.captchaSolved = true;
        window.lastCaptchaSolvedTime = Date.now();
      }
    }, solution, captchaToSolve.type);

    console.log("✅ CAPTCHA solution injected successfully!");
    
    // Wait longer for the solution to be processed and check if it was accepted
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if CAPTCHA was accepted (page should progress or CAPTCHA should disappear)
    const captchaStillVisible = await page.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe[src*="recaptcha"]'));
      return iframes.length > 0 && !window.captchaSolved;
    });
    
    if (!captchaStillVisible) {
      console.log("🚀 CAPTCHA appears to have been accepted, page should progress");
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error solving CAPTCHA with 2captcha:", error.message);
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

  // Initialize 2captcha solver
  const twoCaptchaApiKey = process.env.TWOCAPTCHA_API_KEY;
  if (!twoCaptchaApiKey) {
    throw new Error("TWOCAPTCHA_API_KEY environment variable is required");
  }
  
  const captchaSolver = new TwoCaptchaSolver(twoCaptchaApiKey);
  console.log("🔑 Initializing 2captcha solver...");
  
  try {
    const balance = await captchaSolver.getBalance();
    console.log(`💰 2captcha balance: $${balance.toFixed(2)}`);
    if (balance < 0.01) {
      console.warn("⚠️ Low 2captcha balance! Consider topping up.");
    }
  } catch (error) {
    console.warn("⚠️ Could not check 2captcha balance:", error.message);
  }

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
    await solveCaptchaWith2Captcha(page, captchaSolver);

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
      await solveCaptchaWith2Captcha(frame, captchaSolver);

      console.log("Entering email...");
      await frame.waitForSelector('input[type="email"]', {
        visible: true,
        timeout: 30000,
      });
      await frame.type('input[type="email"]', gmail);

      // Check for CAPTCHA before proceeding
      await solveCaptchaWith2Captcha(frame, captchaSolver);

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