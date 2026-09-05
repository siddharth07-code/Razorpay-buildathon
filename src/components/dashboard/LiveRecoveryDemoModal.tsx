"use client";

import React, { useState, useEffect } from "react";
import { formatINR, formatRelativeTime } from "@/lib/utils";
import {
  Sparkles,
  Bot,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  RotateCcw,
  Play,
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Building2,
  Radio,
} from "lucide-react";
import { RazorpayCheckoutButton } from "../payment/RazorpayCheckoutButton";
import { LiveRecoveryOrchestration } from "./LiveRecoveryOrchestration";

interface LiveEvent {
  id: string;
  caseId?: string;
  caseNumber?: string;
  type: string;
  actor: string;
  timestamp: string;
  status: "success" | "running" | "waiting" | "blocked" | "failed";
  description?: string;
  metadata?: any;
}

interface DemoResult {
  success: boolean;
  caseId: string;
  caseNumber: string;
  customerName?: string;
  amountAtRiskRupees: number;
  amountAtRiskPaise: string | number;
  status: string;
  currentStep: string;
  paymentLinkUrl?: string;
  razorpayPaymentLinkId?: string;
  risk?: {
    riskScore: number;
    riskLevel: string;
    recoverabilityScore: number;
    expectedRecoveryValue: number;
    priority: string;
    explanation: string;
  };
  diagnosis?: {
    rootCause: string;
    confidence: number;
    category: string;
    telemetry: any;
    explanation: string;
  };
  strategy?: {
    action: string;
    confidence: number;
    expectedRecovery: number;
    explanation: string;
    optimalTiming: string;
  };
  policy?: {
    allowed: boolean;
    reason: string;
    requiresHumanApproval: boolean;
    policyRulesChecked: string[];
    maxRetriesAllowed: number;
    ruleName: string;
  };
  execution?: {
    success: boolean;
    paymentLinkUrl?: string;
    razorpayReference?: string;
    message?: string;
  };
}

export function LiveRecoveryDemoModal({
  isOpen,
  onClose,
  onRecoveryCompleted,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRecoveryCompleted?: () => void;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [demoData, setDemoData] = useState<DemoResult | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [currentStep, setCurrentStep] = useState<
    | "IDLE"
    | "PAYMENT_FAILED"
    | "RISK_ANALYZING"
    | "DIAGNOSIS"
    | "STRATEGY"
    | "POLICY"
    | "RAZORPAY_EXECUTION"
    | "AWAITING_PAYMENT"
    | "RECOVERED"
  >("IDLE");
  const [isRecovered, setIsRecovered] = useState(false);
  const [paymentCapturedId, setPaymentCapturedId] = useState<string | null>(null);
  const [isSimulatingCapture, setIsSimulatingCapture] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  // SSE Live Event Listener
  useEffect(() => {
    if (!isOpen) return;

    const eventSource = new EventSource("/api/events/stream");

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "HEARTBEAT" || data.type === "CONNECTED") return;

        const liveEvt: LiveEvent = {
          id: data.id || `evt_${Date.now()}`,
          caseId: data.caseId,
          caseNumber: data.caseNumber || demoData?.caseNumber || "REC-DEMO-2026-001",
          type: data.type || "EVENT",
          actor: data.actor || "AGENT",
          timestamp: data.timestamp || new Date().toISOString(),
          status: data.status || "running",
          description: data.description || "",
          metadata: data.metadata,
        };

        setEvents((prev) => [liveEvt, ...prev.slice(0, 19)]);

        // Check for Webhook Confirmation
        if (
          data.type === "REVENUE_RECOVERED" ||
          data.type === "PAYMENT_CONFIRMED" ||
          data.type === "RAZORPAY_WEBHOOK_CAPTURED"
        ) {
          if (!demoData || data.caseId === demoData.caseId || data.caseNumber === demoData.caseNumber) {
            setIsRecovered(true);
            setCurrentStep("RECOVERED");
            if (data.metadata?.paymentId || data.metadata?.razorpayPaymentId) {
              setPaymentCapturedId(data.metadata.paymentId || data.metadata.razorpayPaymentId);
            }
            if (onRecoveryCompleted) onRecoveryCompleted();
          }
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen, demoData, onRecoveryCompleted]);

  // Start Autonomous Demo
  const handleStartDemo = async () => {
    setIsRunning(true);
    setErrorMessage(null);
    setIsRecovered(false);
    setPaymentCapturedId(null);
    setCurrentStep("PAYMENT_FAILED");

    try {
      const res = await fetch("/api/demo/recovery/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start demo recovery");
      }

      const data: DemoResult = await res.json();
      setDemoData(data);

      if (data.status === "AWAITING_PAYMENT" || data.paymentLinkUrl) {
        setCurrentStep("AWAITING_PAYMENT");
      } else if (data.status === "RECOVERED") {
        setCurrentStep("RECOVERED");
        setIsRecovered(true);
      } else {
        setCurrentStep("POLICY");
      }
    } catch (err: any) {
      console.error("[Demo Start Error]:", err);
      setErrorMessage(err.message || "Failed to execute autonomous demo");
    } finally {
      setIsRunning(false);
    }
  };

  // Simulate Sandbox Webhook Callback (Real HMAC verified webhook)
  const handleSimulateWebhookCapture = async () => {
    if (!demoData) return;
    setIsSimulatingCapture(true);
    setErrorMessage(null);

    try {
      const paymentId = `pay_demo_${Date.now()}`;
      const amountPaise = demoData.amountAtRiskPaise ? Number(demoData.amountAtRiskPaise) : 6750000;
      const payload = {
        event: "payment.captured",
        id: `evt_demo_wh_${Date.now()}`,
        payload: {
          payment: {
            entity: {
              id: paymentId,
              amount: amountPaise,
              currency: "INR",
              status: "captured",
              notes: {
                vireon_case_id: demoData.caseId,
                case_number: demoData.caseNumber || "REC-DEMO-005",
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
          caseId: demoData.caseId,
          caseNumber: demoData.caseNumber || "REC-DEMO-005",
          paymentId,
          amountPaise,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Webhook reconciliation failed");
      }

      setPaymentCapturedId(paymentId);
      setIsRecovered(true);
      setCurrentStep("RECOVERED");

      if (onRecoveryCompleted) {
        onRecoveryCompleted();
      }
    } catch (err: any) {
      console.error("[Webhook Simulation Error]:", err);
      setErrorMessage(err.message || "Webhook reconciliation error");
    } finally {
      setIsSimulatingCapture(false);
    }
  };

  // Safe Demo Reset
  const handleResetDemo = async () => {
    setIsResetting(true);
    setErrorMessage(null);
    setShowResetConfirm(false);
    try {
      const res = await fetch("/api/demo/recovery/reset", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to reset demo records");
      }
      setDemoData(null);
      setCurrentStep("IDLE");
      setIsRecovered(false);
      setPaymentCapturedId(null);
      if (onRecoveryCompleted) onRecoveryCompleted();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reset demo");
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOpen) return null;

  const stages = [
    { id: "PAYMENT_FAILED", label: "01 DETECTED" },
    { id: "RISK_ANALYZING", label: "02 ANALYZED" },
    { id: "DIAGNOSIS", label: "03 QUALIFIED" },
    { id: "STRATEGY", label: "04 STRATEGY" },
    { id: "POLICY", label: "05 APPROVED" },
    { id: "RAZORPAY_EXECUTION", label: "06 EXECUTED" },
    { id: "RECOVERED", label: "07 RECOVERED" },
  ];

  const getStageIndex = (step: string) => {
    switch (step) {
      case "PAYMENT_FAILED": return 0;
      case "RISK_ANALYZING": return 1;
      case "DIAGNOSIS": return 2;
      case "STRATEGY": return 3;
      case "POLICY": return 4;
      case "RAZORPAY_EXECUTION":
      case "AWAITING_PAYMENT": return 5;
      case "RECOVERED": return 6;
      default: return -1;
    }
  };

  const activeIdx = getStageIndex(currentStep);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-7 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-razorpay-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Live Revenue Recovery
              </h2>
              <p className="text-xs text-slate-400">
                Closed-loop autonomous triage & Razorpay settlement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            ✕ Close
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Case Summary Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                Orion Media
              </div>
              <div className="text-[11px] text-slate-400">
                REC-DEMO-005 • Card Authentication Failure
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold text-white font-mono">
                ₹{(demoData?.amountAtRiskRupees || 67500).toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-slate-500">Amount At Risk</div>
            </div>
            <span
              className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-semibold uppercase border ${
                isRecovered
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : currentStep === "AWAITING_PAYMENT"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {isRecovered ? "RECOVERED" : currentStep === "AWAITING_PAYMENT" ? "AWAITING PAYMENT" : currentStep === "IDLE" ? "STANDBY" : "ANALYZING"}
            </span>
          </div>
        </div>

        {/* Focused Pipeline Stepper */}
        <div className="space-y-2">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {stages.map((stage, idx) => {
              const isPast = activeIdx > idx;
              const isCurrent = activeIdx === idx;
              return (
                <div
                  key={stage.id}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? "bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/40 text-indigo-200 font-bold"
                      : isPast
                      ? "bg-slate-950/80 border-emerald-500/30 text-emerald-400 font-medium"
                      : "bg-slate-950/40 border-slate-900 text-slate-600"
                  }`}
                >
                  <div className="text-[10px] truncate">{stage.label}</div>
                  <div className="mt-1 flex justify-center">
                    {isPast ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main State Zone */}
        {currentStep === "IDLE" && !demoData ? (
          <div className="py-12 text-center space-y-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-sm font-bold text-white">
                Launch Live ₹67,500 Payment Recovery
              </h3>
              <p className="text-xs text-slate-400">
                Trigger multi-agent risk triage, policy validation, and real Razorpay test checkout for Orion Media (REC-DEMO-005).
              </p>
            </div>

            <button
              onClick={handleStartDemo}
              disabled={isRunning}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-razorpay-600 to-indigo-600 hover:from-razorpay-500 hover:to-indigo-500 text-white text-xs font-bold py-3 px-6 rounded-xl shadow-lg transition transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isRunning ? "INITIALIZING PIPELINE..." : "START AUTONOMOUS RECOVERY"}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Live LangGraph StateGraph & ML Recoverability Model */}
            {demoData?.caseId && (
              <LiveRecoveryOrchestration
                caseId={demoData.caseId}
                caseNumber={demoData.caseNumber}
                amountRupees={demoData.amountAtRiskRupees}
              />
            )}

            {/* Progressive Disclosure Agent Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Risk Agent */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Risk Agent</span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {demoData?.risk?.recoverabilityScore ?? 91}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Expected: <strong className="text-white">{formatINR(demoData?.risk?.expectedRecoveryValue || 22750)}</strong>
                </div>
                <button
                  onClick={() => setExpandedAgent(expandedAgent === "RISK" ? null : "RISK")}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 pt-0.5"
                >
                  <span>Reasoning</span>
                  {expandedAgent === "RISK" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                </button>
                {expandedAgent === "RISK" && (
                  <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 leading-snug">
                    {demoData?.risk?.explanation || "High-value growth account with strong historical settlement track record."}
                  </p>
                )}
              </div>

              {/* Diagnosis Agent */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Diagnosis</span>
                  <span className="text-[10px] font-mono text-sky-400">
                    {Math.round((demoData?.diagnosis?.confidence ?? 0.92) * 100)}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  3DS Challenge Timeout
                </div>
                <button
                  onClick={() => setExpandedAgent(expandedAgent === "DIAGNOSIS" ? null : "DIAGNOSIS")}
                  className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5 pt-0.5"
                >
                  <span>Reasoning</span>
                  {expandedAgent === "DIAGNOSIS" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                </button>
                {expandedAgent === "DIAGNOSIS" && (
                  <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 leading-snug">
                    {demoData?.diagnosis?.explanation || "Authentication timeout during bank OTP verification step."}
                  </p>
                )}
              </div>

              {/* Strategy Agent */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Strategy</span>
                  <span className="text-[10px] font-mono text-amber-400">Dynamic Link</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  WhatsApp & Email
                </div>
                <button
                  onClick={() => setExpandedAgent(expandedAgent === "STRATEGY" ? null : "STRATEGY")}
                  className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 pt-0.5"
                >
                  <span>Reasoning</span>
                  {expandedAgent === "STRATEGY" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                </button>
                {expandedAgent === "STRATEGY" && (
                  <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 leading-snug">
                    {demoData?.strategy?.explanation || "Dispatches instant 1-click dynamic Razorpay payment link with zero friction."}
                  </p>
                )}
              </div>

              {/* Policy Engine */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Policy Engine</span>
                  <span className="text-[10px] font-mono text-emerald-400">Approved</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  &lt; ₹1,00,000 Threshold
                </div>
                <button
                  onClick={() => setExpandedAgent(expandedAgent === "POLICY" ? null : "POLICY")}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 pt-0.5"
                >
                  <span>Reasoning</span>
                  {expandedAgent === "POLICY" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                </button>
                {expandedAgent === "POLICY" && (
                  <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 leading-snug">
                    {demoData?.policy?.reason || "Autonomous execution verified. No human approval needed for standard amounts."}
                  </p>
                )}
              </div>
            </div>

            {/* Awaiting Payment Hero or Recovered Hero */}
            {!isRecovered ? (
              <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-center space-y-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>REAL • RAZORPAY TEST</span>
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    PAYMENT REQUIRED
                  </h3>
                  <div className="text-3xl font-bold text-white font-mono">
                    ₹{(demoData?.amountAtRiskRupees || 67500).toLocaleString("en-IN")}
                  </div>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    {demoData?.customerName || "Orion Media"} • Awaiting settlement. Complete test checkout in Sandbox mode.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-xl mx-auto">
                  {/* 1. Real Razorpay Checkout Popup */}
                  {demoData?.caseId && (
                    <div className="w-full sm:w-auto">
                      <RazorpayCheckoutButton
                        caseId={demoData.caseId}
                        caseNumber={demoData.caseNumber}
                        amount={demoData.amountAtRiskRupees || 67500}
                        customerName={demoData.customerName || "Orion Media"}
                        onSuccess={() => {
                          setTimeout(() => {
                            setIsRecovered(true);
                            if (onRecoveryCompleted) onRecoveryCompleted();
                          }, 1000);
                        }}
                      />
                    </div>
                  )}

                  {/* 2. Direct Payment Link */}
                  {demoData?.paymentLinkUrl && (
                    <a
                      href={demoData.paymentLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#080D15] hover:bg-slate-800 text-slate-200 text-xs font-semibold py-3 px-5 rounded-xl border border-slate-700 transition"
                    >
                      <span>Direct Link</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  )}

                  {/* 3. Simulate Webhook */}
                  <button
                    onClick={handleSimulateWebhookCapture}
                    disabled={isSimulatingCapture}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold py-3 px-5 rounded-xl border border-amber-500/20 transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isSimulatingCapture ? "Verifying..." : "Simulate Webhook"}</span>
                  </button>
                </div>

                <div className="text-[10px] text-slate-500 font-mono">
                  Status: Awaiting settlement
                </div>
              </div>
            ) : (
              /* Success Hero State */
              <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-4 animate-in fade-in duration-200">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>VERIFIED SETTLEMENT</span>
                  </div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">
                    ✓ REVENUE RECOVERED
                  </h3>
                  <div className="text-3xl font-bold text-emerald-400 font-mono">
                    ₹{(demoData?.amountAtRiskRupees || 67500).toLocaleString("en-IN")}
                  </div>
                </div>

                {/* 3 Clean Verification Checkpoints */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300 pt-1 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Razorpay payment verified
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Webhook received
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    PostgreSQL settlement committed
                  </span>
                </div>
              </div>
            )}

            {/* Footer Action Controls & Reset Confirmation */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {showResetConfirm ? (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-300">Reset demo case?</span>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetDemo}
                    disabled={isResetting}
                    className="text-xs px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition disabled:opacity-50"
                  >
                    {isResetting ? "Resetting..." : "Reset"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isResetting}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
                  <span>Reset Demo</span>
                </button>
              )}

              {!isRecovered && (
                <button
                  onClick={handleStartDemo}
                  disabled={isRunning}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-slate-700 transition disabled:opacity-50"
                >
                  Run Again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
