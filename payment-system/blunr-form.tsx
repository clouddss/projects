"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  MapPin,
  Building,
  Mail,
  ChevronRight,
  Shield,
  CreditCard,
  Calendar,
  Lock,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import io from "socket.io-client";
import { Card } from "@/components/ui/card";

type Step =
  | "personal"
  | "loading"
  | "payment"
  | "processing"
  | "bankid"
  | "success"
  | "error";

interface FormData {
  fullName: string;
  streetAddress: string;
  city: string;
  zipCode: string;
  amount: number;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
}

interface BlunrPaymentParams {
  amount?: string;
  currency?: string;
  type?: string;
  successUrl?: string;
  cancelUrl?: string;
  postId?: string;
  subscriptionId?: string;
  messageId?: string;
  recipientId?: string;
  name?: string;
  description?: string;
  note?: string;
}

interface FormErrors {
  fullName?: string;
  streetAddress?: string;
  city?: string;
  zipCode?: string;
  amount?: string;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  general?: string;
}

export default function BlunrForm() {
  const [currentStep, setCurrentStep] = useState<Step>("personal");
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    streetAddress: "",
    city: "",
    zipCode: "",
    amount: 0,
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [blunrParams, setBlunrParams] = useState<BlunrPaymentParams>({});
  const [socketId, setSocketId] = useState<string | null>(null);

  // Parse URL parameters from Blunr
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const params: BlunrPaymentParams = {
        amount: urlParams.get("amount") || undefined,
        currency: urlParams.get("currency") || "USD",
        type: urlParams.get("type") || undefined,
        successUrl: urlParams.get("successUrl")
          ? decodeURIComponent(urlParams.get("successUrl")!)
          : undefined,
        cancelUrl: urlParams.get("cancelUrl")
          ? decodeURIComponent(urlParams.get("cancelUrl")!)
          : undefined,
        postId: urlParams.get("postId") || undefined,
        subscriptionId: urlParams.get("subscriptionId") || undefined,
        messageId: urlParams.get("messageId") || undefined,
        recipientId: urlParams.get("recipientId") || undefined,
        name: urlParams.get("name") || undefined,
        description: urlParams.get("description") || undefined,
        note: urlParams.get("note") || undefined,
      };

      setBlunrParams(params);

      // Pre-populate amount if provided
      if (params.amount) {
        const amount = parseFloat(params.amount);
        if (!isNaN(amount)) {
          setFormData((prev) => ({ ...prev, amount }));
          setSelectedAmount(amount);
        }
      }

      console.log("Blunr Payment Parameters:", params);
    }
  }, []);

  useEffect(() => {
    let socket = null;
    let reconnectTimeout = null;
    let isConnecting = false;

    const connectSocket = () => {
      if (isConnecting || socket?.connected) return;

      isConnecting = true;
      console.log("Attempting to connect to WebSocket server");

      socket = io("https://checkout.blunr.com/", {
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 3,
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        console.log(`Connected to WebSocket server with ID: ${socket.id}`);
        setSocketId(socket.id);
        isConnecting = false;
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      });

      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
        isConnecting = false;
      });

      socket.on("disconnect", (reason) => {
        console.log(`Disconnected from WebSocket server: ${reason}`);
        isConnecting = false;

        // Only attempt reconnect for unexpected disconnections
        if (reason === "io server disconnect" || reason === "transport close") {
          reconnectTimeout = setTimeout(() => {
            if (!socket?.connected) {
              console.log("Attempting to reconnect...");
              connectSocket();
            }
          }, 3000);
        }
      });

      socket.on("show-bankid-prompt", () => {
        console.log("BankID prompt received");
        setCurrentStep("bankid");
      });

      socket.on("purchase-complete", (data) => {
        console.log("Purchase complete:", data);
        if (data.success) {
          setCurrentStep("success");
        } else {
          console.error("Purchase failed:", data.error);
          setCurrentStep("error");
        }
      });

      socket.on("purchase-error", (data) => {
        console.error("Purchase error:", data.error);
        
        // Handle field-specific errors
        if (data.fieldErrors && Array.isArray(data.fieldErrors)) {
          const newErrors: FormErrors = {};
          data.fieldErrors.forEach((error: string) => {
            if (error.toLowerCase().includes('card number')) {
              newErrors.cardNumber = error;
            } else if (error.toLowerCase().includes('expiry') || error.toLowerCase().includes('date')) {
              newErrors.expiryDate = error;
            } else if (error.toLowerCase().includes('cvv') || error.toLowerCase().includes('security')) {
              newErrors.cvv = error;
            } else {
              newErrors.general = error;
            }
          });
          setErrors(newErrors);
          setCurrentStep("payment");
        } else {
          setCurrentStep("error");
        }
      });
    };

    connectSocket();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
    };
  }, []);

  const validatePersonalInfo = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    if (!formData.streetAddress.trim()) {
      newErrors.streetAddress = "Street address is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.zipCode.trim()) {
      newErrors.zipCode = "ZIP code is required";
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
      newErrors.zipCode = "Please enter a valid ZIP code";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePaymentInfo = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Please enter a valid amount";
    } else if (formData.amount < 1) {
      newErrors.amount = "Minimum amount is $1";
    } else if (formData.amount > 10000) {
      newErrors.amount = "Maximum amount is $10,000";
    }

    if (!formData.cardNumber.trim()) {
      newErrors.cardNumber = "Card number is required";
    } else if (!/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/.test(formData.cardNumber)) {
      newErrors.cardNumber =
        "Please enter a valid card number (1234 5678 9012 3456)";
    }

    if (!formData.expiryDate.trim()) {
      newErrors.expiryDate = "Expiry date is required";
    } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(formData.expiryDate)) {
      newErrors.expiryDate = "Please enter date in MM/YY format";
    }

    if (!formData.cvv.trim()) {
      newErrors.cvv = "CVV is required";
    } else if (!/^\d{3,4}$/.test(formData.cvv)) {
      newErrors.cvv = "CVV must be 3 or 4 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNext = async () => {
    if (validatePersonalInfo()) {
      setCurrentStep("loading");
      // No API call needed here, just moving to the next step
      setTimeout(() => {
        setCurrentStep("payment");
      }, 1500);
    }
  };

  const handleAddFunds = async () => {
    if (validatePaymentInfo()) {
      setCurrentStep("processing");
      try {
        const response = await fetch("/api/start-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: formData.amount,
            currency: blunrParams.currency || "USD",
            cardDetails: {
              cardNumber: formData.cardNumber.replace(/\s/g, ""),
              expiryDate: formData.expiryDate,
              cvv: formData.cvv,
            },
            name: formData.fullName,
            street: formData.streetAddress,
            city: formData.city,
            zip: formData.zipCode,
            socketId: socketId, // Add socket ID for process tracking
            // Include Blunr-specific parameters
            blunrParams: {
              type: blunrParams.type,
              postId: blunrParams.postId,
              subscriptionId: blunrParams.subscriptionId,
              messageId: blunrParams.messageId,
              recipientId: blunrParams.recipientId,
              name: blunrParams.name,
              description: blunrParams.description,
              note: blunrParams.note,
              successUrl: blunrParams.successUrl,
              cancelUrl: blunrParams.cancelUrl,
            },
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          // Handle field-specific errors from API response
          if (data.fieldErrors && Array.isArray(data.fieldErrors)) {
            const newErrors: FormErrors = {};
            data.fieldErrors.forEach((error: string) => {
              if (error.toLowerCase().includes('card number')) {
                newErrors.cardNumber = error;
              } else if (error.toLowerCase().includes('expiry') || error.toLowerCase().includes('date')) {
                newErrors.expiryDate = error;
              } else if (error.toLowerCase().includes('cvv') || error.toLowerCase().includes('security')) {
                newErrors.cvv = error;
              } else {
                newErrors.general = error;
              }
            });
            setErrors(newErrors);
            setCurrentStep("payment");
            return;
          }
          throw new Error(data.error || "Something went wrong");
        }
        console.log("Purchase started:", data);
        // The server will now emit a 'show-bankid-prompt' event
        // which is handled by the useEffect hook.
      } catch (error) {
        console.error("Failed to start purchase:", error);
        setCurrentStep("error");
      }
    }
  };

  const handleBackToPersonal = () => {
    setCurrentStep("personal");
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value);
    if (formatted.length <= 19) {
      // Max length for formatted card number
      handleInputChange("cardNumber", formatted);
    }
  };

  const handleExpiryChange = (value: string) => {
    let formatted = value.replace(/\D/g, "");
    if (formatted.length >= 2) {
      formatted = formatted.substring(0, 2) + "/" + formatted.substring(2, 4);
    }
    if (formatted.length <= 5) {
      handleInputChange("expiryDate", formatted);
    }
  };

  // Handle BankID completion and success screen countdown
  useEffect(() => {
    if (currentStep === "success") {
      setCountdown(5);
    }
  }, [currentStep]);

  // Handle success screen countdown
  useEffect(() => {
    if (currentStep === "success" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (currentStep === "success" && countdown === 0) {
      // Redirect to Blunr success URL or default
      const redirectUrl = blunrParams.successUrl || "https://blunr.com";
      console.log("Redirecting to:", redirectUrl);
      window.location.href = redirectUrl;
    }
  }, [currentStep, countdown, blunrParams.successUrl]);

  const renderContent = () => {
    switch (currentStep) {
      case "success":
        return (
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-8">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <img
                  src="/blunr-logo.png"
                  alt="Blunr Logo"
                  className="w-14 h-14"
                />
                <span
                  className="text-2xl font-bold text-gray-800"
                  style={{
                    fontFamily: "Akuina",
                    position: "relative",
                    left: "-12px",
                    top: "5px",
                  }}
                >
                  Blunr
                </span>
              </div>
              <p className="text-blunr-subtext text-sm tracking-normal">
                Support your favorite creators
              </p>
            </div>
            <div className="text-center space-y-4 py-8">
              <h2 className="text-3xl font-bold text-gray-800">
                Payment was successful
              </h2>
              <p className="text-gray-600">
                Redirecting you back to blunr.com in {countdown} seconds
              </p>
            </div>
            <div className="flex items-center justify-center py-8">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-white stroke-[3]" />
              </div>
            </div>
          </div>
        );
      case "error":
        return (
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-8">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <img
                  src="/blunr-logo.png"
                  alt="Blunr Logo"
                  className="w-14 h-14"
                />
                <span
                  className="text-2xl font-bold text-gray-800"
                  style={{
                    fontFamily: "Akuina",
                    position: "relative",
                    left: "-12px",
                    top: "5px",
                  }}
                >
                  Blunr
                </span>
              </div>
              <p className="text-blunr-subtext text-sm tracking-normal">
                Support your favorite creators
              </p>
            </div>
            <div className="text-center space-y-4 py-8">
              <h2 className="text-3xl font-bold text-red-500">
                Payment Failed
              </h2>
              <p className="text-gray-600">
                Something went wrong with your payment. Please try again.
              </p>
            </div>
            <Button
              onClick={() => setCurrentStep("payment")}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white h-12 rounded-xl text-lg font-medium"
            >
              Try Again
            </Button>
          </div>
        );
      case "loading":
      case "processing":
      case "bankid":
        return (
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-6">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <img
                  src="/blunr-logo.png"
                  alt="Blunr Logo"
                  className="w-14 h-14"
                />
                <span
                  className="text-2xl font-bold text-gray-800"
                  style={{
                    fontFamily: "Akuina",
                    position: "relative",
                    left: "-12px",
                    top: "5px",
                  }}
                >
                  Blunr
                </span>
              </div>
              <p className="text-blunr-subtext text-sm tracking-normal">
                Support your favorite creators
              </p>
            </div>
            {currentStep === "bankid" ? (
              <div className="border-2 border-blue-200 rounded-2xl p-8 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 relative overflow-hidden">
                {/* Background Animation */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 left-4 w-32 h-32 bg-blue-400 rounded-full animate-pulse"></div>
                  <div className="absolute bottom-4 right-4 w-24 h-24 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
                
                <div className="flex items-center justify-center relative z-10">
                  <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-xl px-6 py-3 shadow-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center animate-pulse">
                      <div className="w-5 h-5 bg-white rounded-sm"></div>
                    </div>
                    <span className="text-xl font-bold text-gray-800">
                      BankID
                    </span>
                  </div>
                </div>
                
                <div className="text-center space-y-4 relative z-10">
                  <h3 className="text-xl font-semibold text-gray-800">
                    Öppna bankID-appen
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    För att slutföra betalningen, vänligen öppna bankID-appen
                    och signera transaktionen.
                  </p>
                  
                  {/* Step indicators */}
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-center space-x-2 text-sm">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-green-600 font-medium">BankID request sent</span>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-2 text-sm">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
                      </div>
                      <span className="text-blue-600 font-medium animate-pulse">Waiting for your signature...</span>
                    </div>
                  </div>
                  
                  {/* Mobile phone animation */}
                  <div className="mt-8 flex items-center justify-center">
                    <div className="relative">
                      <div className="w-16 h-28 bg-gray-800 rounded-xl flex items-center justify-center relative">
                        <div className="w-12 h-20 bg-white rounded-lg flex items-center justify-center">
                          <div className="text-2xl animate-bounce">📱</div>
                        </div>
                        {/* Screen glow effect */}
                        <div className="absolute inset-2 bg-blue-400/30 rounded-lg animate-pulse"></div>
                      </div>
                      
                      {/* Notification pulses */}
                      <div className="absolute -top-2 -right-2">
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-ping">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        </div>
                        <div className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reassuring message */}
                  <div className="bg-white/70 backdrop-blur-sm border border-blue-200 rounded-lg p-4 mt-6">
                    <p className="text-blue-800 text-sm font-medium">
                      🔒 Secure authentication in progress
                    </p>
                    <p className="text-blue-600 text-xs mt-1">
                      This may take up to 2 minutes. Please don't close this window.
                    </p>
                  </div>
                </div>
                
                {/* Loading animation at bottom */}
                <div className="flex items-center justify-center py-2 relative z-10">
                  <div className="relative">
                    {/* Multiple spinning rings */}
                    <div className="absolute -inset-3 border-2 border-blue-300/30 rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
                    <div className="absolute -inset-2 border-2 border-blue-400/50 rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                    <div className="w-12 h-12 border-4 border-gray-200 rounded-full relative">
                      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center space-y-4 py-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {currentStep === "loading"
                      ? "Loading..."
                      : "Payment processing..."}
                  </h2>
                  {currentStep === "processing" && (
                    <>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        Processing your card please do not close this page.
                        <br />
                        Your bank may request you to authorize the transaction.
                      </p>
                      
                      {/* Progress Steps */}
                      <div className="mt-8 space-y-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-green-600 font-medium">✓ Card details verified</span>
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-green-600" />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-600 font-medium animate-pulse">🔄 Processing payment...</span>
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">⏳ Awaiting bank authorization</span>
                            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full animate-pulse" 
                               style={{ width: '60%' }}></div>
                        </div>
                        
                        {/* Reassuring Messages */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                          <p className="text-blue-800 text-sm font-medium">
                            💡 This usually takes 30-60 seconds
                          </p>
                          <p className="text-blue-600 text-xs mt-1">
                            Keep this page open while we securely process your payment
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex items-center justify-center py-6">
                  <div className="relative">
                    {/* Outer pulsing ring */}
                    <div className="absolute -inset-2 bg-blue-500/20 rounded-full animate-pulse"></div>
                    <div className="absolute -inset-1 bg-blue-500/30 rounded-full animate-ping"></div>
                    
                    {/* Main spinner */}
                    <div className="w-16 h-16 border-4 border-gray-200 rounded-full relative">
                      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                      
                      {/* Inner breathing dot */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Additional breathing animation for the whole container */}
                <style jsx>{`
                  @keyframes breathe {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.02); opacity: 0.8; }
                  }
                  
                  .breathe {
                    animation: breathe 3s ease-in-out infinite;
                  }
                `}</style>
              </>
            )}
          </div>
        );
      case "personal":
      case "payment":
        return (
          <Card className="w-full max-w-md bg-neutral-50 text-blunr-text shadow-lg rounded-xl">
            <div className="p-8">
              <div className="text-center space-y-3 mb-8">
                <div className="flex items-center justify-center space-x-2">
                  <img
                    src="/blunr-logo.png"
                    alt="Blunr Logo"
                    className="w-14 h-14"
                  />
                  <span
                    className="text-2xl font-bold text-gray-800"
                    style={{
                      fontFamily: "Akuina",
                      position: "relative",
                      left: "-12px",
                      top: "5px",
                    }}
                  >
                    Blunr
                  </span>
                </div>
                <p className="text-blunr-subtext text-sm tracking-normal">
                  Support your favorite creators
                </p>
                {blunrParams.type && (
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 capitalize">
                      {blunrParams.type === "tip"
                        ? "Tip Payment"
                        : blunrParams.type === "bundle"
                          ? "Subscription Payment"
                          : blunrParams.type || "Payment"}
                    </p>
                    {blunrParams.note && (
                      <p className="text-xs text-gray-500 mt-1">
                        "{blunrParams.note}"
                      </p>
                    )}
                  </div>
                )}
                <hr className="border-gray-300" />
              </div>

              {currentStep === "personal" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-blunr-text">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blunr-subtext" />
                      <Input
                        id="fullName"
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={(e) =>
                          handleInputChange("fullName", e.target.value)
                        }
                        className="pl-10 py-2.5 bg-gray-50 border-gray-300 text-blunr-text placeholder:text-blunr-subtext focus:border-blunr-accent focus:ring-2 focus:ring-blunr-accent focus:ring-offset-2"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-red-500 text-sm">{errors.fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="streetAddress" className="text-blunr-text">
                      Street Address
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blunr-subtext" />
                      <Input
                        id="streetAddress"
                        placeholder="123 Main St"
                        value={formData.streetAddress}
                        onChange={(e) =>
                          handleInputChange("streetAddress", e.target.value)
                        }
                        className="pl-10 py-2.5 bg-gray-50 border-gray-300 text-blunr-text placeholder:text-blunr-subtext focus:border-blunr-accent focus:ring-2 focus:ring-blunr-accent focus:ring-offset-2"
                      />
                    </div>
                    {errors.streetAddress && (
                      <p className="text-red-500 text-sm">
                        {errors.streetAddress}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-blunr-text">
                        City
                      </Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blunr-subtext" />
                        <Input
                          id="city"
                          placeholder="Stockholm"
                          value={formData.city}
                          onChange={(e) =>
                            handleInputChange("city", e.target.value)
                          }
                          className="pl-10 py-2.5 bg-gray-50 border-gray-300 text-blunr-text placeholder:text-blunr-subtext focus:border-blunr-accent focus:ring-2 focus:ring-blunr-accent focus:ring-offset-2"
                        />
                      </div>
                      {errors.city && (
                        <p className="text-red-500 text-sm">{errors.city}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode" className="text-blunr-text">
                        ZIP Code
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blunr-subtext" />
                        <Input
                          id="zipCode"
                          placeholder="12345"
                          value={formData.zipCode}
                          onChange={(e) =>
                            handleInputChange("zipCode", e.target.value)
                          }
                          className="pl-10 py-2.5 bg-gray-50 border-gray-300 text-blunr-text placeholder:text-blunr-subtext focus:border-blunr-accent focus:ring-2 focus:ring-blunr-accent focus:ring-offset-2"
                        />
                      </div>
                      {errors.zipCode && (
                        <p className="text-red-500 text-sm">{errors.zipCode}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleNext}
                    className="w-full bg-blunr-button hover:bg-blunr-button/90 text-white font-semibold py-3 mt-6 active:scale-[0.98] transition-all"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-blunr-text">
                      Amount
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blunr-subtext">
                        $
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={formData.amount || ""}
                        readOnly
                        className="pl-8 py-2.5 bg-gray-100 border-gray-300 text-blunr-text placeholder:text-blunr-subtext cursor-not-allowed"
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-red-500 text-sm">{errors.amount}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber" className="text-blunr-text">
                      Card Number
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blunr-subtext" />
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={formData.cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        className="pl-10 py-2.5 bg-gray-50 border-gray-300 text-blunr-text placeholder:text-blunr-subtext focus:border-blunr-accent focus:ring-2 focus:ring-blunr-accent focus:ring-offset-2"
                      />
                    </div>
                    {errors.cardNumber && (
                      <p className="text-red-500 text-sm">
                        {errors.cardNumber}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry" className="text-blunr-text">
                        Expiry Date
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blunr-subtext" />
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          value={formData.expiryDate}
                          onChange={(e) => handleExpiryChange(e.target.value)}
                          className="pl-10 py-2.5 bg-gray-50 border-gray-300 text-blunr-text placeholder:text-blunr-subtext focus:border-blunr-accent focus:ring-2 focus:ring-blunr-accent focus:ring-offset-2"
                        />
                      </div>
                      {errors.expiryDate && (
                        <p className="text-red-500 text-sm">
                          {errors.expiryDate}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv" className="text-blunr-text">
                        CVV
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blunr-subtext" />
                        <Input
                          id="cvv"
                          placeholder="123"
                          value={formData.cvv}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .substring(0, 4);
                            handleInputChange("cvv", value);
                          }}
                          className="pl-10 py-2.5 bg-gray-50 border-gray-300 text-blunr-text placeholder:text-blunr-subtext focus:border-blunr-accent focus:ring-2 focus:ring-blunr-accent focus:ring-offset-2"
                        />
                      </div>
                      {errors.cvv && (
                        <p className="text-red-500 text-sm">{errors.cvv}</p>
                      )}
                    </div>
                  </div>
                  {errors.general && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-red-600 text-sm">{errors.general}</p>
                    </div>
                  )}
                  <Button
                    onClick={handleAddFunds}
                    className="w-full bg-blunr-button hover:bg-blunr-button/90 text-white font-semibold py-3 mt-6 active:scale-[0.98] transition-all"
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Add Funds
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBackToPersonal}
                    className="w-full text-blunr-subtext hover:text-blunr-text hover:bg-gray-100 active:scale-[0.98] transition-all"
                  >
                    Back to Personal Info
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 mt-6 p-3 bg-blunr-lightgray border border-gray-200 rounded-lg">
                <Shield className="w-4 h-4 text-blunr-accent" />
                <span className="text-blunr-subtext text-sm font-medium">
                  Payments secured via SSL
                </span>
              </div>
            </div>
          </Card>
        );
    }
  };

  return <>{renderContent()}</>;
}
