// Ultra-simple payment detection:
// 1. Check for error toast → FAILED
// 2. Check for "funds are on the way" → SUCCESS
// 3. Keep checking until one is found

const checkPaymentStatus = async (page, outerFrame, maxWaitTime = 120000) => {
  console.log("🎯 ULTRA-SIMPLE PAYMENT CHECK: Looking for error toast or success message...");
  
  const startTime = Date.now();
  const checkInterval = 3000; // Check every 3 seconds
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const result = await outerFrame.evaluate(() => {
        // 1. First check for error toast - if found, payment failed
        const errorToast = document.querySelector('.widget-content-toast--error');
        if (errorToast && errorToast.textContent) {
          const toastText = errorToast.textContent.toLowerCase();
          console.log("🚨 Error toast found:", toastText);
          
          if (toastText.includes("declined") || 
              toastText.includes("contact your bank") ||
              toastText.includes("payment has been declined") ||
              toastText.includes("error") ||
              toastText.includes("failed")) {
            return { 
              success: false, 
              error: "Payment failed - error toast detected",
              toastText: toastText.trim()
            };
          }
        }
        
        // 2. Check page content for "funds are on the way" or similar success messages
        const pageText = document.body.textContent.toLowerCase();
        
        if (pageText.includes("funds are on the way") ||
            pageText.includes("payment successful") ||
            pageText.includes("transaction successful") ||
            pageText.includes("your payment has been processed") ||
            pageText.includes("payment completed") ||
            pageText.includes("deposit successful")) {
          console.log("✅ Success message found - payment succeeded!");
          return { 
            success: true, 
            source: "success_message_detected",
            message: "Funds are on the way or payment success message found"
          };
        }
        
        // 3. Check for error messages in page content
        if (pageText.includes("the payment has been declined") ||
            pageText.includes("please contact your bank") ||
            pageText.includes("payment failed") ||
            pageText.includes("betalningen har avvisats")) {
          return { 
            success: false, 
            error: "Payment failed - error message in page content"
          };
        }
        
        // Nothing found yet, keep checking
        return null;
      });

      if (result) {
        console.log("💡 Payment status determined:", JSON.stringify(result, null, 2));
        return result;
      }
      
      // Wait before next check
      console.log(`⏳ No clear result yet, waiting ${checkInterval/1000}s before next check...`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      
    } catch (error) {
      console.log("⚠️ Error during check, retrying:", error.message);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }
  
  // Timeout reached - assume failure for safety
  console.log("⏰ Timeout reached - no clear success/failure detected, assuming failure for safety");
  return { 
    success: false, 
    error: `No clear payment result after ${maxWaitTime/1000} seconds - assuming failure for safety`
  };
};

module.exports = { checkPaymentStatus };