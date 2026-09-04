"use client";

import React, { useState, useEffect } from "react";
import { formatINR } from "@/lib/utils";
import {
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Zap,
  Info,
  TrendingUp,
  X,
  Play,
  RotateCcw,
} from "lucide-react";
import { RazorpayCheckoutButton } from "../payment/RazorpayCheckoutButton";

export function LiveRecoveryDemoPanel({
  isOpen,
  onClose,
  onRecoveryCompleted,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRecoveryCompleted?: () => void;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [demoData, setDemoData] = useState<any | null>(null);
  const [currentStep, setCurrentStep] = useState<string>("IDLE");
  const [isRecovered, setIsRecovered] = useState(false);
  const [isSimulatingCapture, setIsSimulatingCapture] = useState(false);

  // SSE Live Event Listener
  useEffect(() => {
    if (!isOpen) return;

    const eventSource = new EventSource("/api/events/stream");
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "HEARTBEAT" || data.type === "CONNECTED") return;

        if (
          data.type === "REVENUE_RECOVERED" ||
          data.type === "PAYMENT_CONFIRMED" ||
          data.type === "RAZORPAY_WEBHOOK_CAPTURED"
        ) {
          setIsRecovered(true);
          setCurrentStep("RECOVERED");
          if (onRecoveryCompleted) onRecoveryCompleted();
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen, onRecoveryCompleted]);

  // Start Autonomous Demo with Double-Click Protection
  const handleStartDemo = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setIsRecovered(false);
    setCurrentStep("PAYMENT_FAILED");

    try {
      const res = await fetch("/api/demo/recovery/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 25000,
          customerName: "Acme Technologies India Pvt Ltd",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDemoData(data);
        setCurrentStep("AWAITING_PAYMENT");
      }
    } catch (err) {
      console.error("Demo error", err);
    } finally {
      setIsRunning(false);
    }
  };

  // Reset Demo to Initial State
  const handleResetDemo = async () => {
    try {
      await fetch("/api/demo/recovery/reset", { method: "POST" });
      setDemoData(null);
      setCurrentStep("IDLE");
      setIsRecovered(false);
      if (onRecoveryCompleted) onRecoveryCompleted();
    } catch (err) {
      console.error("Reset error", err);
    }
  };

  // Simulate Webhook (Sandbox) with Double-Click Protection
  const handleSimulateWebhook = async () => {
    if (isSimulatingCapture) return;
    setIsSimulatingCapture(true);
    try {
      const paymentId = `pay_demo_${Date.now()}`;
      const payload = {
        event: "payment.captured",
        id: `evt_demo_wh_${Date.now()}`,
        payload: {
          payment: {
            entity: {
              id: paymentId,
              amount: 2500000,
              currency: "INR",
              status: "captured",
              notes: {
                vireon_case_id: demoData?.caseId,
                case_number: demoData?.caseNumber || "REC-2026-00124",
              },
            },
          },
        },
      };

      const res = await fetch("/api/demo/recovery/simulate-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caseId: demoData?.caseId,
          caseNumber: demoData?.caseNumber || "REC-DEMO-005",
          amountPaise: demoData?.amountAtRiskPaise || 6750000,
        }),
      });

      if (res.ok) {
        setIsRecovered(true);
        setCurrentStep("RECOVERED");
        if (onRecoveryCompleted) onRecoveryCompleted();
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("Webhook simulation error:", errData);
      }
    } catch (err) {
      console.error("Webhook simulation error", err);
    } finally {
      setIsSimulatingCapture(false);
    }
  };

  if (!isOpen) return null;

  const paymentLink = demoData?.paymentLinkUrl || "https://rzp.io/i/demo_link_vireon";

  return (
    <div className="w-full lg:w-[380px] xl:w-[410px] shrink-0 bg-[#0F1523] border border-[#1E293B] rounded-2xl p-5 space-y-5 shadow-xl flex flex-col justify-between animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="space-y-4">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B]/80 pb-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-tight">
              Live Recovery Demo
            </h2>
            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              LIVE
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Case Summary Header Box */}
        <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-[#0B0F17] border border-[#1E293B]">
          <div className="space-y-1">
            <div className="text-[11px] font-mono text-slate-400">
              {demoData?.caseNumber || "REC-DEMO-005"}
            </div>
            <div className="text-xl font-bold text-white font-mono">
              ₹{(demoData?.amountAtRiskRupees || 67500).toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-400 font-sans">at risk</span>
            </div>
            <div className="text-xs text-slate-300 font-medium pt-0.5">
              Orion Media
            </div>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/25 px-2 py-0.5 rounded-full">
                <span>Card Authentication Failure</span>
                <Info className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>

          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Recovery Pipeline */}
        <div className="space-y-3 pt-1">
          <div className="text-xs font-bold text-white uppercase tracking-wider text-[11px]">
            Recovery Pipeline
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Step 1: Payment Failure Detected */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white text-xs">Payment Failure Detected</div>
                  <div className="text-[10px] text-slate-400">Card Authentication Failure</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500">10:02 AM</span>
            </div>

            {/* Step 2: Risk Analysis */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white text-xs">AI Risk Analysis</div>
                  <div className="text-[10px] text-slate-400">Risk: 42 • Recoverability: 93%</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500">10:02 AM</span>
            </div>

            {/* Step 3: Failure Diagnosis */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white text-xs">Failure Diagnosis</div>
                  <div className="text-[10px] text-slate-400">3DS Challenge Dropoff</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500">10:03 AM</span>
            </div>

            {/* Step 4: Strategy Formulation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white text-xs">Strategy Formulation</div>
                  <div className="text-[10px] text-slate-400">Dynamic 1-Click Link</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500">10:03 AM</span>
            </div>

            {/* Step 5: Policy Gate Verification */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white text-xs">Policy Gate Verification</div>
                  <div className="text-[10px] text-emerald-400">Auto-approved (&lt; ₹1,00,000)</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500">10:04 AM</span>
            </div>

            {/* Step 6: Razorpay Execution */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0 shadow-sm">
                  6
                </div>
                <div>
                  <div className="font-semibold text-purple-300 text-xs">Razorpay Execution</div>
                  <div className="text-[10px] text-slate-400">Order & Checkout Ready</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500">10:04 AM</span>
            </div>

            {/* Step 7: Revenue Recovered */}
            <div className="flex items-center justify-between opacity-60">
              <div className="flex items-center gap-2">
                {isRecovered ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-700 text-slate-500 font-bold text-[9px] flex items-center justify-center shrink-0">
                    7
                  </div>
                )}
                <div>
                  <div className={`text-xs ${isRecovered ? "font-bold text-emerald-400" : "font-medium text-slate-400"}`}>
                    Revenue Recovered
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Card: Payment Required or Recovered */}
        {!isRecovered ? (
          <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B] space-y-3">
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">
                  PAYMENT REQUIRED
                </span>
                <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded">
                  REAL • RAZORPAY TEST
                </span>
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                ₹{(demoData?.amountAtRiskRupees || 67500).toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] text-slate-400">
                Orion Media • Awaiting settlement
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {/* 1. Real Razorpay Checkout Popup */}
              {demoData?.caseId && (
                <RazorpayCheckoutButton
                  caseId={demoData.caseId}
                  caseNumber={demoData.caseNumber}
                  amount={demoData.amountAtRiskRupees || 67500}
                  customerName="Orion Media"
                  onSuccess={() => {
                    setTimeout(() => {
                      setIsRecovered(true);
                      setCurrentStep("RECOVERED");
                      if (onRecoveryCompleted) onRecoveryCompleted();
                    }, 1000);
                  }}
                />
              )}

              {/* 2. Direct Payment Link */}
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 bg-[#0F1523] hover:bg-slate-800 text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl border border-[#1E293B] transition transform hover:scale-[1.01]"
              >
                <span>Open Razorpay Payment Link</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>

              <button
                onClick={handleSimulateWebhook}
                disabled={isSimulatingCapture}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold py-2 px-4 rounded-xl border border-amber-500/20 transition disabled:opacity-50"
              >
                <span>Simulate Webhook (Sandbox)</span>
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
              </button>
            </div>

            <div className="text-[10px] text-slate-500 leading-snug pt-1">
              Status: Awaiting settlement. Settlement confirmed via Razorpay webhook.
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3 text-center animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-bold text-emerald-400 uppercase tracking-wider font-mono mb-1">
                <span>VERIFIED SETTLEMENT</span>
              </div>
              <div className="text-xs font-bold text-white uppercase">✓ REVENUE RECOVERED</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                ₹{(demoData?.amountAtRiskRupees || 67500).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="text-[11px] text-slate-300 font-medium flex items-center justify-center gap-3">
              <span>Payment captured ✓</span>
              <span>Webhook verified ✓</span>
            </div>
          </div>
        )}
      </div>

      {/* Trigger Button if Idle or Recovered */}
      {currentStep === "IDLE" && !demoData ? (
        <div className="pt-2">
          <button
            onClick={handleStartDemo}
            disabled={isRunning}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? "Starting..." : "Start Demo Recovery"}</span>
          </button>
        </div>
      ) : (
        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={handleResetDemo}
            className="w-full bg-[#0B0F17] hover:bg-slate-800 text-slate-300 text-xs font-semibold py-2 px-3 rounded-xl border border-[#1E293B] transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>
      )}
    </div>
  );
}
