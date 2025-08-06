const axios = require("axios");

class TwoCaptchaSolver {
  constructor(apiKey) {
    this.apiKey = "6bff1751082ccdcb34c1a1ea93581e9e";
    this.baseUrl = "http://2captcha.com";
    this.maxAttempts = 180; // 15 minutes max wait time for complex challenges
    this.pollInterval = 5000; // 5 seconds
  }

  async solveRecaptchaV2(sitekey, pageUrl, proxy = null, invisible = false) {
    try {
      console.log("🔄 Submitting reCAPTCHA v2 to 2captcha...");

      const submitData = {
        method: "userrecaptcha",
        googlekey: sitekey,
        pageurl: pageUrl,
        key: this.apiKey,
        json: 1,
      };
      
      // Handle invisible reCAPTCHA
      if (invisible) {
        submitData.invisible = 1;
      }

      // Add proxy if provided
      if (proxy) {
        submitData.proxy = proxy.host + ":" + proxy.port;
        submitData.proxytype = proxy.type || "HTTP";
        if (proxy.username && proxy.password) {
          submitData.proxy =
            proxy.username + ":" + proxy.password + "@" + submitData.proxy;
        }
      }

      const submitResponse = await axios.post(
        `${this.baseUrl}/in.php`,
        submitData,
        {
          timeout: 30000,
        },
      );

      if (submitResponse.data.status !== 1) {
        throw new Error(
          `2captcha submit failed: ${submitResponse.data.error_text || "Unknown error"}`,
        );
      }

      const captchaId = submitResponse.data.request;
      console.log(`✅ reCAPTCHA submitted to 2captcha. Task ID: ${captchaId}`);

      // Poll for result
      return await this.pollForResult(captchaId);
    } catch (error) {
      console.error("❌ Failed to solve reCAPTCHA v2:", error.message);
      throw error;
    }
  }

  async solveRecaptchaV3(
    sitekey,
    pageUrl,
    action = "verify",
    minScore = 0.3,
    proxy = null,
  ) {
    try {
      console.log("🔄 Submitting reCAPTCHA v3 to 2captcha...");

      const submitData = {
        method: "userrecaptcha",
        version: "v3",
        googlekey: sitekey,
        pageurl: pageUrl,
        action: action,
        min_score: minScore,
        key: this.apiKey,
        json: 1,
      };

      // Add proxy if provided
      if (proxy) {
        submitData.proxy = proxy.host + ":" + proxy.port;
        submitData.proxytype = proxy.type || "HTTP";
        if (proxy.username && proxy.password) {
          submitData.proxy =
            proxy.username + ":" + proxy.password + "@" + submitData.proxy;
        }
      }

      const submitResponse = await axios.post(
        `${this.baseUrl}/in.php`,
        submitData,
        {
          timeout: 30000,
        },
      );

      if (submitResponse.data.status !== 1) {
        throw new Error(
          `2captcha submit failed: ${submitResponse.data.error_text || "Unknown error"}`,
        );
      }

      const captchaId = submitResponse.data.request;
      console.log(
        `✅ reCAPTCHA v3 submitted to 2captcha. Task ID: ${captchaId}`,
      );

      return await this.pollForResult(captchaId);
    } catch (error) {
      console.error("❌ Failed to solve reCAPTCHA v3:", error.message);
      throw error;
    }
  }

  async solveFunCaptcha(publicKey, pageUrl, proxy = null) {
    try {
      console.log("🔄 Submitting FunCaptcha to 2captcha...");

      const submitData = {
        method: "funcaptcha",
        publickey: publicKey,
        pageurl: pageUrl,
        key: this.apiKey,
        json: 1,
      };

      if (proxy) {
        submitData.proxy = proxy.host + ":" + proxy.port;
        submitData.proxytype = proxy.type || "HTTP";
        if (proxy.username && proxy.password) {
          submitData.proxy =
            proxy.username + ":" + proxy.password + "@" + submitData.proxy;
        }
      }

      const submitResponse = await axios.post(
        `${this.baseUrl}/in.php`,
        submitData,
        {
          timeout: 30000,
        },
      );

      if (submitResponse.data.status !== 1) {
        throw new Error(
          `2captcha submit failed: ${submitResponse.data.error_text || "Unknown error"}`,
        );
      }

      const captchaId = submitResponse.data.request;
      console.log(`✅ FunCaptcha submitted to 2captcha. Task ID: ${captchaId}`);

      return await this.pollForResult(captchaId);
    } catch (error) {
      console.error("❌ Failed to solve FunCaptcha:", error.message);
      throw error;
    }
  }

  async solveHCaptcha(sitekey, pageUrl, proxy = null) {
    try {
      console.log("🔄 Submitting hCaptcha to 2captcha...");

      const submitData = {
        method: "hcaptcha",
        sitekey: sitekey,
        pageurl: pageUrl,
        key: this.apiKey,
        json: 1,
      };

      if (proxy) {
        submitData.proxy = proxy.host + ":" + proxy.port;
        submitData.proxytype = proxy.type || "HTTP";
        if (proxy.username && proxy.password) {
          submitData.proxy =
            proxy.username + ":" + proxy.password + "@" + submitData.proxy;
        }
      }

      const submitResponse = await axios.post(
        `${this.baseUrl}/in.php`,
        submitData,
        {
          timeout: 30000,
        },
      );

      if (submitResponse.data.status !== 1) {
        throw new Error(
          `2captcha submit failed: ${submitResponse.data.error_text || "Unknown error"}`,
        );
      }

      const captchaId = submitResponse.data.request;
      console.log(`✅ hCaptcha submitted to 2captcha. Task ID: ${captchaId}`);

      return await this.pollForResult(captchaId);
    } catch (error) {
      console.error("❌ Failed to solve hCaptcha:", error.message);
      throw error;
    }
  }

  async pollForResult(captchaId) {
    console.log(`🔄 Polling for captcha result... (Task ID: ${captchaId})`);

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, this.pollInterval));

        const resultResponse = await axios.get(`${this.baseUrl}/res.php`, {
          params: {
            key: this.apiKey,
            action: "get",
            id: captchaId,
            json: 1,
          },
          timeout: 15000,
        });

        if (resultResponse.data.status === 1) {
          console.log(
            `✅ CAPTCHA solved successfully after ${attempt} attempts`,
          );
          return resultResponse.data.request;
        } else if (resultResponse.data.error_text === "CAPCHA_NOT_READY") {
          console.log(
            `⏳ CAPTCHA not ready yet (attempt ${attempt}/${this.maxAttempts})`,
          );
          continue;
        } else {
          throw new Error(
            `2captcha error: ${resultResponse.data.error_text || "Unknown error"}`,
          );
        }
      } catch (error) {
        if (
          error.message.includes("CAPCHA_NOT_READY") ||
          attempt < this.maxAttempts
        ) {
          console.log(
            `⏳ Waiting for captcha result... (attempt ${attempt}/${this.maxAttempts})`,
          );
          continue;
        }
        throw error;
      }
    }

    throw new Error("CAPTCHA solving timed out after maximum attempts");
  }

  async getBalance() {
    try {
      const response = await axios.get(`${this.baseUrl}/res.php`, {
        params: {
          key: this.apiKey,
          action: "getbalance",
        },
      });

      // Handle both string and object responses
      const responseData = typeof response.data === 'string' ? response.data : response.data.toString();
      
      if (responseData.startsWith("ERROR_")) {
        throw new Error(`2captcha error: ${responseData}`);
      }

      return parseFloat(responseData);
    } catch (error) {
      console.error("❌ Failed to get 2captcha balance:", error.message);
      throw error;
    }
  }

  async reportBad(captchaId) {
    try {
      const response = await axios.get(`${this.baseUrl}/res.php`, {
        params: {
          key: this.apiKey,
          action: "reportbad",
          id: captchaId,
        },
      });

      console.log("📤 Reported bad captcha result to 2captcha");
      return response.data === "OK_REPORT_RECORDED";
    } catch (error) {
      console.error("❌ Failed to report bad captcha:", error.message);
      return false;
    }
  }
}

module.exports = TwoCaptchaSolver;
