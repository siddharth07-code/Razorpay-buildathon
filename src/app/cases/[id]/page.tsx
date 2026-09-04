"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RecoveryCase } from "@/types";
import { formatINR, formatDateTime, formatRelativeTime } from "@/lib/utils";
import { getCaseActionAvailability } from "@/lib/case-actions";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  History,
  MessageSquare,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Clock,
  Send,
} from "lucide-react";
import { RazorpayCheckoutButton } from "@/components/payment/RazorpayCheckoutButton";
import { LiveRecoveryOrchestration } from "@/components/dashboard/LiveRecoveryOrchestration";

export default function StandaloneCasePage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [caseItem, setCaseItem] = useState<RecoveryCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadCase = async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (res.ok) {
        const data = await res.json();
        setCaseItem({
          ...data,
          timeline: Array.isArray(data.timeline) ? data.timeline : [],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [caseId]);

  const handleExecuteAction = async (actionType: string) => {
    if (!caseItem) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/cases/${caseItem.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          amount: caseItem.amount,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || "Action executed successfully!");
        if (data.case) {
          setCaseItem({
            ...data.case,
            timeline: Array.isArray(data.case.timeline) ? data.case.timeline : [],
          });
        } else {
          await loadCase();
        }
      } else {
        setActionMessage(`Error: ${data.error || "Action failed"}`);
        await loadCase();
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
      await loadCase();
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-razorpay-400" />
        <span>Loading case telemetry...</span>
      </div>
    );
  }

  if (!caseItem) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-slate-400 text-sm">Recovery case "{caseId}" not found.</p>
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-xs text-razorpay-400 hover:text-razorpay-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Recovery Queue</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/cases"
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white font-mono">{caseItem.caseNumber}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                  caseItem.status === "RECOVERED"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-razorpay-500/10 text-razorpay-400 border-razorpay-500/30"
                }`}
              >
                {caseItem.status}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                  caseItem.riskLevel === "CRITICAL"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                {caseItem.riskLevel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Opened {formatDateTime(caseItem.createdAt)} ({formatRelativeTime(caseItem.createdAt)})
            </p>
          </div>
        </div>

        <button
          onClick={loadCase}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded border border-slate-800 transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Main Grid: Left 2 Cols Telemetry, Right 1 Col Actions & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-5">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-surface-card border border-surface-border rounded-lg p-4">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Amount at Risk
              </span>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {formatINR(caseItem.amount)}
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Currency: INR (₹)
              </span>
            </div>

            <div className="bg-surface-card border border-surface-border rounded-lg p-4">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Customer LTV
              </span>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                {formatINR(caseItem.customer?.ltv || 0)}
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Tier: {caseItem.customer?.tier || "ENTERPRISE"}
              </span>
            </div>

            <div className="bg-surface-card border border-surface-border rounded-lg p-4">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                AI Expected Recovery
              </span>
              <div className="text-xl font-bold text-sky-400 font-mono mt-1">
                {Math.round((caseItem.aiRecommendation?.expectedRecoveryProbability || 0.88) * 100)}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Confidence: {Math.round((caseItem.aiRecommendation?.confidence || 0.92) * 100)}%
              </span>
            </div>
          </div>

          {/* AI Root Cause & Heuristic Engine */}
          <div className="bg-surface-card border border-surface-border rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-razorpay-500/10 border border-razorpay-500/20 flex items-center justify-center text-razorpay-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                VIREON Root Cause & Strategy Breakdown
              </h3>
            </div>

            <div className="p-4 rounded bg-slate-900/80 border border-slate-800 space-y-2.5 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-razorpay-400">
                  Diagnosis Rationale
                </span>
                <p className="text-slate-200 mt-1 leading-relaxed">
                  {caseItem.rootCauseDetails}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400">Recommended Channel:</span>
                  <p className="font-semibold text-white mt-0.5">
                    {caseItem.aiRecommendation?.recommendedChannel || "WHATSAPP"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Optimal Window:</span>
                  <p className="font-semibold text-slate-200 mt-0.5">
                    {caseItem.aiRecommendation?.optimalRetryTime || "Immediate"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Current Step:</span>
                  <p className="font-mono text-razorpay-400 mt-0.5 font-semibold">
                    {caseItem.currentStep}
                  </p>
                </div>
              </div>
            </div>

            {caseItem.paymentLinkUrl && (
              <div className={`p-3 rounded border flex items-center justify-between text-xs font-mono ${
                caseItem.status === "RECOVERED"
                  ? "bg-emerald-950/20 border-emerald-500/30 text-slate-300"
                  : "bg-slate-950 border-slate-800 text-slate-300"
              }`}>
                <div className="truncate">
                  {caseItem.status === "RECOVERED" && (
                    <span className="text-[10px] text-emerald-400 font-sans font-semibold uppercase tracking-wider block mb-0.5">
                      ✓ Historical Payment Link (Settled)
                    </span>
                  )}
                  <span className="text-slate-500">Payment Link:</span> {caseItem.paymentLinkUrl}
                </div>
                <a
                  href={caseItem.paymentLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${caseItem.status === "RECOVERED" ? "text-emerald-400 hover:text-emerald-300" : "text-razorpay-400 hover:text-razorpay-300"} flex items-center gap-1 font-sans text-xs ml-3 font-semibold flex-shrink-0`}
                >
                  {caseItem.status === "RECOVERED" ? "View Link" : "Test Link"} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Razorpay Telemetry & Transaction Inspector */}
          <div className="bg-surface-card border border-surface-border rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Razorpay Transaction Telemetry
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment ID:</span>
                  <span className="text-white">{caseItem.payment?.razorpayPaymentId || caseItem.paymentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Method:</span>
                  <span className="text-white">{caseItem.payment?.method?.toUpperCase() || "NACH"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bank Gateway:</span>
                  <span className="text-white">{caseItem.payment?.bank || "HDFC Bank"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Attempts:</span>
                  <span className="text-white">{caseItem.payment?.attempts || 1}</span>
                </div>
              </div>

              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Error Code:</span>
                  <span className="text-rose-400 font-bold">{caseItem.payment?.errorCode || caseItem.rootCause}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Error Source:</span>
                  <span className="text-white">{caseItem.payment?.errorSource || "bank"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Error Step:</span>
                  <span className="text-white">{caseItem.payment?.errorStep || "mandate_execution"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Currency:</span>
                  <span className="text-white">INR (₹)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Profile */}
          <div className="bg-surface-card border border-surface-border rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Customer & Contract Information
              </h3>
            </div>

            <div className="p-3.5 rounded bg-slate-900/60 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Merchant / Customer:</span>
                <span className="text-white font-medium">{caseItem.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Company Name:</span>
                <span className="text-white font-medium">{caseItem.customer?.companyName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-white font-mono text-[11px]">{caseItem.customer?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="text-white font-mono text-[11px]">{caseItem.customer?.phone}</span>
              </div>
              {caseItem.customer?.gstNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-400">GSTIN:</span>
                  <span className="text-white font-mono text-[11px]">{caseItem.customer.gstNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Timeline */}
        <div className="space-y-5">
          {/* Real-time LangGraph Live Orchestration */}
          <LiveRecoveryOrchestration
            caseId={caseItem.id}
            caseNumber={caseItem.caseNumber}
            amountRupees={caseItem.amount}
            onWorkflowUpdated={loadCase}
          />

          {/* Action Bench / Terminal Status */}
          {/* Action Availability Interventions */}
          {(() => {
            const availability = getCaseActionAvailability(caseItem);

            if (availability.isTerminal) {
              if (caseItem.status === "RECOVERED") {
                return (
                  <div className="bg-[#0F1523] border border-emerald-500/30 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase tracking-wider">
                        ✓ RECOVERED
                      </h3>
                    </div>
                    <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Revenue Recovered:</span>
                        <span className="font-bold text-emerald-400 font-mono text-sm">{formatINR(caseItem.recoveredAmount || caseItem.amount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Recovered At:</span>
                        <span className="text-slate-200 font-mono text-[11px]">
                          {caseItem.recoveredAt ? formatDateTime(caseItem.recoveredAt) : "Confirmed"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 pt-1.5 border-t border-emerald-500/20">
                        Recovery successfully completed. No further recovery action required.
                      </p>
                    </div>
                  </div>
                );
              }
              return (
                <div className="bg-[#0F1523] border border-[#1E293B] rounded-xl p-5 space-y-2 text-xs">
                  <div className="font-bold uppercase tracking-wider text-slate-300">{availability.statusLabel}</div>
                  <p className="text-slate-400">{availability.statusDescription}</p>
                </div>
              );
            }

            if (caseItem.status === "AWAITING_PAYMENT") {
              return (
                <div className="bg-[#0F1523] border border-amber-500/30 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Clock className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase tracking-wider">
                        PAYMENT REQUIRED
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded">
                      RAZORPAY TEST MODE
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-500/20 space-y-3 text-xs">
                    <div className="text-xl font-bold text-white font-mono">
                      {formatINR(caseItem.amount)}
                    </div>
                    <p className="text-xs text-slate-300">
                      Real Razorpay Checkout session is ready for test settlement.
                    </p>

                    {/* 1. Real Razorpay Checkout.js Button */}
                    <div className="pt-1 space-y-2">
                      <RazorpayCheckoutButton
                        caseId={caseItem.id}
                        caseNumber={caseItem.caseNumber}
                        amount={caseItem.amount}
                        customerName={caseItem.customer?.name}
                        onSuccess={() => {
                          loadCase();
                          setTimeout(loadCase, 1500);
                        }}
                      />

                      {/* 2. Optional Fallback: Direct Payment Link */}
                      {caseItem.paymentLinkUrl && (
                        <a
                          href={caseItem.paymentLinkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-1.5 bg-[#080D15] hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium py-2 px-3 rounded-xl transition"
                        >
                          <span>Open Payment Link Directly</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
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
                </div>
              );
            }

            if (caseItem.status === "ACTION_SELECTED") {
              return (
                <div className="bg-[#0F1523] border border-purple-500/30 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Zap className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      STRATEGY SELECTED
                    </h3>
                  </div>
                  <div className="p-3.5 rounded-lg bg-purple-950/20 border border-purple-500/20 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Selected Action:</span>
                      <span className="font-semibold text-purple-300">{caseItem.selectedAction || "Dynamic 1-Click Link"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Expected Recovery:</span>
                      <span className="font-bold text-emerald-400 font-mono">{formatINR(caseItem.expectedRecoveryValue || caseItem.amount * 0.88)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300">
                    Strategy formulated by AI. Click below to validate policy guardrails and execute the recovery intervention.
                  </p>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleExecuteAction("CONTINUE_RECOVERY")}
                    className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    <span>{actionLoading ? "Executing..." : "Execute Recovery Strategy"}</span>
                  </button>
                </div>
              );
            }

            return (
              <div className="bg-[#0F1523] border border-[#1E293B] rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Trigger Operational Action
                </h3>

                <div className="space-y-2">
                  {availability.canAnalyze && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleExecuteAction("ANALYZE")}
                      className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{actionLoading ? "Analyzing..." : "Run AI Triage"}</span>
                    </button>
                  )}
                  {availability.canContinueRecovery && !availability.canAnalyze && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleExecuteAction("CONTINUE_RECOVERY")}
                      className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition disabled:opacity-50"
                    >
                      <span>Continue Recovery</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Activity Timeline Ledger */}
          <div className="bg-surface-card border border-surface-border rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Activity Audit Ledger
              </h3>
            </div>

            {Array.isArray(caseItem.timeline) && caseItem.timeline.length > 0 ? (
              <div className="relative pl-4 space-y-4 border-l border-slate-800 text-xs">
                {(caseItem.timeline ?? []).map((event) => (
                  <div key={event.id} className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-razorpay-500 ring-4 ring-surface-card" />
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold text-white">{event.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{event.description}</p>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold font-mono">
                      Actor: {event.actor}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs">
                No activity events recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
