"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RecoveryCase } from "@/types";
import { formatINR, formatDateTime, formatRelativeTime } from "@/lib/utils";
import { getCaseActionAvailability } from "@/lib/case-actions";
import {
  ExternalLink,
  MessageSquare,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Mail,
  Phone,
  CreditCard,
  History,
  FileText,
  ShieldCheck,
  Play,
  RotateCcw,
  Clock,
  ArrowRight,
  UserCheck,
  XCircle,
} from "lucide-react";
import { RazorpayCheckoutButton } from "../payment/RazorpayCheckoutButton";

export function RecoveryCaseDrawer({
  caseItem,
  onClose,
  onCaseUpdated,
}: {
  caseItem: RecoveryCase | null;
  onClose: () => void;
  onCaseUpdated?: () => void;
}) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [currentCase, setCurrentCase] = useState<RecoveryCase | null>(caseItem);

  React.useEffect(() => {
    setCurrentCase(caseItem);
    setActionMessage(null);
  }, [caseItem]);

  if (!currentCase) return null;

  const availability = getCaseActionAvailability(currentCase);

  const reloadCaseFromBackend = async () => {
    try {
      const res = await fetch(`/api/cases/${currentCase.id}`);
      if (res.ok) {
        const freshData = await res.json();
        setCurrentCase(freshData);
      }
    } catch (err) {
      console.warn("Failed to reload case:", err);
    }
  };

  const handleExecuteAction = async (actionType: string) => {
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/cases/${currentCase.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage({ text: data.message || "Action executed successfully!" });
        if (data.case) {
          setCurrentCase(data.case);
        } else {
          await reloadCaseFromBackend();
        }
        if (onCaseUpdated) onCaseUpdated();
      } else {
        setActionMessage({
          text: data.message || data.error || "Failed to execute action",
          isError: true,
        });
        // On 409 or conflict, reload authoritative PostgreSQL state
        await reloadCaseFromBackend();
      }
    } catch (err: any) {
      setActionMessage({
        text: err?.message || "Network error executing action",
        isError: true,
      });
      await reloadCaseFromBackend();
    } finally {
      setActionLoading(false);
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "HIGH":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "MEDIUM":
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0F1523] border-l border-[#1E293B] w-full max-w-xl h-full p-6 overflow-y-auto shadow-2xl space-y-5">
        {/* Sandbox Indicator Banner */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-semibold text-amber-300 font-mono text-[11px]">RAZORPAY SANDBOX / TEST MODE</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Simulated Settlement Supported</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base font-mono">
                {currentCase.caseNumber}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${availability.statusBadgeClass}`}
              >
                {availability.statusLabel}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getRiskBadge(
                  currentCase.riskLevel
                )}`}
              >
                {currentCase.riskLevel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Opened {formatDateTime(currentCase.createdAt)} ({formatRelativeTime(currentCase.createdAt)})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/cases/${currentCase.id}`}
              className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded"
              title="Open full dedicated page"
            >
              <span>Full Page</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-sm font-mono px-2 py-1 bg-slate-900 rounded border border-slate-800"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800 grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Amount at Risk
            </span>
            <p className="text-xl font-bold text-white font-mono mt-0.5">
              {formatINR(currentCase.amount)}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Expected Recoverable
            </span>
            <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
              {formatINR(currentCase.expectedRecoveryValue || currentCase.amount * 0.88)}
            </p>
          </div>
        </div>

        {/* Prominent Payment Link CTA if Available */}
        {currentCase.paymentLinkUrl && (
          currentCase.status === "RECOVERED" ? (
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Historical Settlement Link (Settled)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Consumed</span>
              </div>
              <p className="text-xs text-slate-400">
                Payment link settled and confirmed via Razorpay webhook.
              </p>
              <div className="pt-1 flex items-center gap-2">
                <a
                  href={currentCase.paymentLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1 transition"
                >
                  <span>View Historical Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Active Razorpay Payment Link
                </span>
                <span className="text-[10px] text-slate-400 font-mono">1-Click Sandbox Checkout</span>
              </div>
              <p className="text-xs text-slate-300">
                Customer settlement link generated via Razorpay API. Open in test mode to simulate live payment capture.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <a
                  href={currentCase.paymentLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition"
                >
                  <span>OPEN RAZORPAY PAYMENT LINK</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )
        )}

        {/* Razorpay Reference Identifiers */}
        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-1.5 font-mono">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block font-sans mb-1">
            Razorpay Telemetry
          </span>
          {currentCase.razorpayOrderId && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Order ID:</span>
              <span className="text-blue-300 font-semibold">{currentCase.razorpayOrderId}</span>
            </div>
          )}
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Payment ID:</span>
            <span className="text-slate-300 font-semibold">
              {currentCase.razorpayPaymentId || (currentCase.status === "RECOVERED" ? "Captured" : "Pending Settlement")}
            </span>
          </div>
          {currentCase.paymentLinkUrl && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Payment Link ID:</span>
              <span className="text-emerald-300 font-semibold">{currentCase.paymentLinkUrl.split("/").pop() || "Active Link"}</span>
            </div>
          )}
        </div>

        {/* Customer Profile */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Customer Profile
          </h4>
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Account Name:</span>
              <span className="text-white font-medium">{currentCase.customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Company:</span>
              <span className="text-white font-medium">{currentCase.customer?.companyName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Email:</span>
              <span className="text-white font-mono text-[11px]">{currentCase.customer?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Phone:</span>
              <span className="text-white font-mono text-[11px]">{currentCase.customer?.phone}</span>
            </div>
          </div>
        </div>

        {/* Operational Interventions */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Recovery Interventions
          </h4>

          {actionMessage && (
            <div
              className={`p-3 rounded text-xs flex items-center gap-2 animate-fadeIn border ${
                actionMessage.isError
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              {actionMessage.isError ? (
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          )}

          {/* Render State-Aligned Action Controls */}
          {availability.isTerminal ? (
            currentCase.status === "RECOVERED" ? (
              <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    ✓ RECOVERED
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Revenue Recovered:</span>
                    <span className="font-bold text-emerald-400 font-mono">{formatINR(currentCase.recoveredAmount || currentCase.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recovered At:</span>
                    <span className="text-slate-200 font-mono text-[11px]">
                      {currentCase.recoveredAt ? formatDateTime(currentCase.recoveredAt) : "Confirmed"}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 pt-2 border-t border-emerald-500/20">
                  No further recovery action required.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <XCircle className="w-4 h-4 text-slate-500" />
                  <span className="font-bold uppercase tracking-wider">{availability.statusLabel}</span>
                </div>
                <p className="text-slate-400">{availability.statusDescription}</p>
              </div>
            )
          ) : currentCase.status === "AWAITING_PAYMENT" ? (
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    PAYMENT REQUIRED
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded">
                  RAZORPAY TEST MODE
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-bold text-white font-mono">
                  {formatINR(currentCase.amount)}
                </div>
                <p className="text-xs text-slate-300">
                  Real Razorpay Checkout session is ready for test settlement.
                </p>
              </div>

              {/* 1. REAL RAZORPAY CHECKOUT POPUP BUTTON */}
              <div className="pt-1 space-y-2">
                <RazorpayCheckoutButton
                  caseId={currentCase.id}
                  caseNumber={currentCase.caseNumber}
                  amount={currentCase.amount}
                  customerName={currentCase.customer?.name}
                  onSuccess={async (res) => {
                    setActionMessage({ text: "Payment processed! Verifying webhook settlement..." });
                    if (onCaseUpdated) onCaseUpdated();
                    // Refetch latest authoritative state
                    setTimeout(async () => {
                      try {
                        const cRes = await fetch(`/api/cases/${currentCase.id}`);
                        if (cRes.ok) {
                          const updatedData = await cRes.json();
                          if (updatedData.case) setCurrentCase(updatedData.case);
                        }
                      } catch (e) {
                        console.error(e);
                      }
                      if (onCaseUpdated) onCaseUpdated();
                    }, 1500);
                  }}
                  onError={(err) => {
                    setActionMessage({ text: err?.message || "Checkout failed", isError: true });
                  }}
                />

                {/* 2. OPTIONAL FALLBACK: Direct Payment Link */}
                {currentCase.paymentLinkUrl && (
                  <a
                    href={currentCase.paymentLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-[#0F1523] hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium py-2 px-3 rounded-xl transition"
                  >
                    <span>Open Payment Link Directly</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                )}
              </div>

              {availability.canConfirmPayment && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleExecuteAction("MARK_RESOLVED")}
                  className="w-full bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold py-1.5 px-3 rounded-lg transition disabled:opacity-50"
                >
                  Simulate Webhook Settlement (Sandbox)
                </button>
              )}
            </div>
          ) : currentCase.status === "ACTION_SELECTED" ? (
            <div className="p-4 rounded-lg bg-purple-950/20 border border-purple-500/30 space-y-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  STRATEGY SELECTED
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Selected Action:</span>
                  <span className="font-semibold text-purple-300">{currentCase.selectedAction || "Dynamic 1-Click Link"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Expected Recovery:</span>
                  <span className="font-bold text-emerald-400 font-mono">{formatINR(currentCase.expectedRecoveryValue || currentCase.amount * 0.88)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-300">
                Strategy formulated by AI. Click below to validate policy guardrails and execute the recovery intervention.
              </p>
              <button
                disabled={actionLoading}
                onClick={() => handleExecuteAction("CONTINUE_RECOVERY")}
                className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition disabled:opacity-50"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>{actionLoading ? "Executing..." : "Execute Recovery Strategy"}</span>
              </button>
            </div>
          ) : currentCase.status === "AWAITING_APPROVAL" || currentCase.status === "PENDING_APPROVAL" ? (
            <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  HUMAN APPROVAL REQUIRED
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Policy engine suspended recovery: Amount exceeds autonomous threshold or critical customer tier.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  disabled={actionLoading}
                  onClick={() => handleExecuteAction("CONTINUE_RECOVERY")}
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition disabled:opacity-50"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => handleExecuteAction("STOP_RECOVERY")}
                  className="flex items-center justify-center gap-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-semibold py-2 px-3 rounded-lg transition disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          ) : currentCase.status === "ANALYZING" || currentCase.status === "EXECUTING" || currentCase.status === "IN_PROGRESS" ? (
            <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-500/30 space-y-2 text-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs font-bold text-white uppercase">{availability.statusLabel}</div>
              <p className="text-xs text-slate-400">{availability.statusDescription}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availability.canAnalyze && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleExecuteAction("ANALYZE")}
                  className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                  <span>{actionLoading ? "Analyzing..." : "Run AI Triage"}</span>
                </button>
              )}
              {availability.canContinueRecovery && !availability.canAnalyze && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleExecuteAction("CONTINUE_RECOVERY")}
                  className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition disabled:opacity-50"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Continue Recovery</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
