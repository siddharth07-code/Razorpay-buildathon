"use client";

import React, { useState } from "react";
import { CreditCard, Loader2, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";

export interface RazorpayCheckoutButtonProps {
  caseId: string;
  caseNumber?: string;
  amount?: number;
  customerName?: string;
  onSuccess?: (paymentData: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
  className?: string;
  label?: string;
  disabled?: boolean;
}

/**
 * Loads Razorpay checkout.js script safely once in browser.
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById("razorpay-checkout-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function RazorpayCheckoutButton({
  caseId,
  caseNumber,
  amount,
  customerName,
  onSuccess,
  onError,
  onCancel,
  className,
  label = "PAY WITH RAZORPAY",
  disabled = false,
}: RazorpayCheckoutButtonProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLaunchCheckout = async () => {
    if (isInitializing || isProcessing || disabled) return;

    setIsInitializing(true);
    setErrorMessage(null);

    try {
      // 1. Request safe checkout info and order from VIREON backend
      const res = await fetch(`/api/recovery/cases/${caseId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.checkout) {
        throw new Error(data.message || data.error || "Failed to initialize checkout session");
      }

      const { checkout } = data;

      // 2. Safely load Razorpay checkout.js
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || !(window as any).Razorpay) {
        throw new Error("Unable to load Razorpay Checkout script. Check internet connection.");
      }

      // 3. Initialize Razorpay Checkout instance with safe public options
      const options: any = {
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency || "INR",
        name: checkout.name || "VIREON",
        description: checkout.description || `Revenue Recovery - ${checkout.caseNumber}`,
        prefill: {
          name: checkout.customer?.name || customerName || "",
          email: checkout.customer?.email || "",
          contact: checkout.customer?.contact || "",
        },
        theme: {
          color: "#3B82F6",
          backdrop_color: "rgba(5, 8, 13, 0.85)",
        },
        modal: {
          ondismiss: () => {
            setIsInitializing(false);
            setIsProcessing(false);
            if (onCancel) onCancel();
          },
        },
        handler: async (response: any) => {
          setIsInitializing(false);
          setIsProcessing(true);

          try {
            // Verify payment server-side with HMAC check
            await fetch(`/api/recovery/cases/${caseId}/payment/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
          } catch (vErr) {
            console.error("[VIREON Checkout] Verification request error:", vErr);
          }

          // Invoke client callback (Note: authoritative settlement will be confirmed by Webhook/PostgreSQL)
          if (onSuccess) {
            onSuccess(response);
          }
        },
      };

      // Only pass order_id if it is a genuine server-created Razorpay order
      if (
        checkout.orderId &&
        checkout.orderId.startsWith("order_") &&
        !checkout.orderId.includes("demo") &&
        !checkout.orderId.includes("sandbox") &&
        !checkout.orderId.includes("mock") &&
        !checkout.orderId.includes("simulated")
      ) {
        options.order_id = checkout.orderId;
      }

      // Safe diagnostic log
      console.log("[FINAL RAZORPAY CHECKOUT]", {
        provider: "RazorpayService",
        mode: "sandbox",
        keyPrefix: options.key ? options.key.substring(0, 9) : "NONE",
        orderId: options.order_id || "NOT_SET",
        amount: options.amount,
        currency: options.currency,
      });

      const razorpayInstance = new (window as any).Razorpay(options);

      razorpayInstance.on("payment.failed", (failedRes: any) => {
        setIsInitializing(false);
        setIsProcessing(false);
        const errDesc = failedRes?.error?.description || "Payment failed or rejected.";
        setErrorMessage(`Payment Not Completed: ${errDesc}`);
        if (onError) onError(failedRes);
      });

      // 4. Open Razorpay Checkout modal
      razorpayInstance.open();
    } catch (err: any) {
      console.error("[RazorpayCheckoutButton Error]:", err);
      setErrorMessage(err?.message || "Failed to launch Razorpay Checkout");
      setIsInitializing(false);
      setIsProcessing(false);
      if (onError) onError(err);
    }
  };

  if (errorMessage) {
    return (
      <div className="space-y-2">
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block text-[11px]">UNABLE TO LOAD RAZORPAY CHECKOUT</span>
            <span className="text-[10px] text-rose-300/80">{errorMessage}</span>
          </div>
        </div>
        <button
          onClick={handleLaunchCheckout}
          className="w-full flex items-center justify-center gap-1.5 bg-[#0F1523] hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold py-2 px-3 rounded-xl transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>RETRY CHECKOUT</span>
        </button>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="w-full py-3 px-4 rounded-xl bg-blue-950/40 border border-blue-500/40 text-blue-300 text-xs flex items-center justify-center gap-2 font-mono animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
        <span className="font-bold">PAYMENT PROCESSING • Verifying settlement...</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleLaunchCheckout}
      disabled={disabled || isInitializing}
      aria-label={label}
      className={
        className ||
        "w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold py-3 px-5 rounded-xl shadow-lg shadow-blue-900/40 transition disabled:opacity-50 select-none group transform hover:scale-[1.01]"
      }
    >
      {isInitializing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-white" />
          <span>INITIALIZING CHECKOUT...</span>
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 text-cyan-200" />
          <span>{label}</span>
          <ExternalLink className="w-3.5 h-3.5 text-cyan-200 ml-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </>
      )}
    </button>
  );
}
