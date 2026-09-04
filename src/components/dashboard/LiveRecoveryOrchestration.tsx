"use client";

import React, { useState, useEffect } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowDown,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Building2,
  RefreshCw,
  Sparkles,
  Zap,
  Info,
  Check,
  X,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

interface LiveRecoveryOrchestrationProps {
  caseId: string;
  caseNumber?: string;
  amountRupees?: number;
  onWorkflowUpdated?: () => void;
  compact?: boolean;
}

export function LiveRecoveryOrchestration({
  caseId,
  caseNumber,
  amountRupees,
  onWorkflowUpdated,
  compact = false,
}: LiveRecoveryOrchestrationProps) {
  const [loading, setLoading] = useState(true);
  const [workflowState, setWorkflowState] = useState<any>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchState = async () => {
    try {
      const res = await fetch(`/api/recovery/cases/${caseId}/graph-state`);
      if (res.ok) {
        const data = await res.json();
        setWorkflowState(data);
      }
    } catch (err) {
      console.warn("[LiveRecoveryOrchestration] Failed to fetch graph state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!caseId) return;
    fetchState();
    const interval = setInterval(fetchState, 3500);
    return () => clearInterval(interval);
  }, [caseId]);

  const handleResumeApproval = async (approved: boolean) => {
    setActing(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/recovery/cases/${caseId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved,
          operator: "Operations Supervisor",
          reason: approved
            ? "Approved high-value recovery via Live Orchestration panel"
            : "Rejected high-value recovery in Human-in-the-Loop gate",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to resume workflow");
      }

      await fetchState();
      if (onWorkflowUpdated) onWorkflowUpdated();
    } catch (err: any) {
      setActionError(err.message || "Failed to submit approval decision");
    } finally {
      setActing(false);
    }
  };

  const values = workflowState?.values || {};
  const currentStage = values.currentStage || "detect";
  const probability = typeof values.riskProbability === "number" ? values.riskProbability : 0.888;
  const recoverabilityScore = typeof values.recoverabilityScore === "number" ? values.recoverabilityScore : Math.round(probability * 100);
  const isAwaitingApproval = values.requiresHumanApproval || values.status === "AWAITING_APPROVAL" || values.isInterrupted;
  const isRecovered = values.status === "RECOVERED" || values.paymentStatus === "CAPTURED";
  const isExecuting = values.executionStatus === "INITIATED" || values.currentStage === "execute";
  const isAwaitingPayment = values.paymentStatus === "AWAITING_PAYMENT" || values.status === "AWAITING_PAYMENT";
  const isStopped = values.status === "STOPPED" || values.approvalStatus === "REJECTED";

  // Nodes definition
  const nodes = [
    {
      id: "detect",
      name: "DETECTED",
      detail: values.caseNumber || caseNumber || "Ingested",
      isComplete: true,
      isActive: currentStage === "detect",
    },
    {
      id: "riskScore",
      name: "ML RISK SCORE",
      detail: `${(probability * 100).toFixed(1)}% Rec. Prob`,
      isComplete: Boolean(values.riskProbability !== undefined || ["diagnose", "strategy", "policy", "humanApproval", "execute", "outcome", "complete"].includes(currentStage)),
      isActive: currentStage === "riskScore",
    },
    {
      id: "diagnose",
      name: "DIAGNOSIS",
      detail: values.rootCause ? values.rootCause.replace(/_/g, " ").toUpperCase() : "AUTHENTICATION FAILURE",
      isComplete: Boolean(values.rootCause || ["strategy", "policy", "humanApproval", "execute", "outcome", "complete"].includes(currentStage)),
      isActive: currentStage === "diagnose",
    },
    {
      id: "strategy",
      name: "STRATEGY",
      detail: values.selectedStrategy ? values.selectedStrategy.replace(/_/g, " ") : "RETRY PAYMENT LINK",
      isComplete: Boolean(values.selectedStrategy || ["policy", "humanApproval", "execute", "outcome", "complete"].includes(currentStage)),
      isActive: currentStage === "strategy",
    },
    {
      id: "policy",
      name: "POLICY GATE",
      detail: isAwaitingApproval ? "HUMAN APPROVAL REQUIRED" : "AUTO APPROVED (< ₹1L)",
      isComplete: Boolean(["humanApproval", "execute", "outcome", "complete"].includes(currentStage) || (!isAwaitingApproval && values.policyReason)),
      isActive: currentStage === "policy",
      isWarning: isAwaitingApproval,
    },
    {
      id: "execute",
      name: "RAZORPAY",
      detail: isRecovered ? "CAPTURED" : isAwaitingPayment ? "PAYMENT LINK ACTIVE" : isExecuting ? "EXECUTING" : isStopped ? "HALTED" : "PENDING",
      isComplete: Boolean(isAwaitingPayment || isRecovered || values.paymentLinkUrl),
      isActive: currentStage === "execute" || isExecuting,
    },
    {
      id: "outcome",
      name: "VERIFICATION",
      detail: isRecovered ? "VERIFIED (POSTGRESQL)" : isAwaitingPayment ? "AWAITING SETTLEMENT" : "MONITORING",
      isComplete: isRecovered,
      isActive: currentStage === "outcome" || isAwaitingPayment,
    },
    {
      id: "complete",
      name: isRecovered ? "RECOVERED" : isStopped ? "HALTED" : "COMPLETION",
      detail: isRecovered
        ? `₹${(amountRupees || 67500).toLocaleString("en-IN")}`
        : isStopped
        ? "STOPPED BY POLICY"
        : "IN PROGRESS",
      isComplete: isRecovered || isStopped,
      isActive: currentStage === "complete" || isRecovered,
      isSuccess: isRecovered,
      isDanger: isStopped,
    },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Compact Live Recovery Orchestration Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 backdrop-blur-md p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Live Recovery Orchestration
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-razorpay-500/10 text-razorpay-400 font-mono border border-razorpay-500/20">
              LangGraph StateGraph v1
            </span>
          </div>

          <button
            onClick={fetchState}
            disabled={loading}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-razorpay-400" : ""}`} />
            <span>Sync State</span>
          </button>
        </div>

        {/* Human Approval Interrupt Alert */}
        {isAwaitingApproval && !isStopped && (
          <div className="mb-4 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>LangGraph Native Interrupt: Human Sign-Off Required</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                Threshold: ≥ ₹1,00,000
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mb-3">
              This recovery case requires manual authorization before financial execution.
              {values.policyReason ? ` Policy: ${values.policyReason}` : " High-value transaction boundary."}
            </p>
            {actionError && (
              <p className="text-rose-400 text-[11px] mb-2">{actionError}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleResumeApproval(true)}
                disabled={acting}
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{acting ? "Resuming..." : "Authorize Execution"}</span>
              </button>
              <button
                onClick={() => handleResumeApproval(false)}
                disabled={acting}
                className="px-3 py-1.5 rounded bg-rose-600/80 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject & Halt</span>
              </button>
            </div>
          </div>
        )}

        {/* Vertical Stepper Pipeline with Transitions */}
        <div className="space-y-2 font-mono text-xs">
          {nodes.map((node, idx) => {
            const isLast = idx === nodes.length - 1;

            return (
              <div key={node.id} className="relative">
                <div
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all duration-300 ${
                    node.isSuccess
                      ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                      : node.isDanger
                      ? "border-rose-500/40 bg-rose-950/20 text-rose-300"
                      : node.isWarning
                      ? "border-amber-500/40 bg-amber-950/20 text-amber-300"
                      : node.isActive
                      ? "border-razorpay-500/60 bg-razorpay-950/20 text-razorpay-300 shadow-[0_0_12px_rgba(59,130,246,0.15)] ring-1 ring-razorpay-400/30"
                      : node.isComplete
                      ? "border-slate-800 bg-slate-900/40 text-slate-200"
                      : "border-slate-900 bg-slate-950 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {node.isSuccess ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : node.isDanger ? (
                      <X className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : node.isWarning ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                    ) : node.isActive ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-razorpay-400 border-t-transparent animate-spin shrink-0" />
                    ) : node.isComplete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                    )}

                    <span className="font-semibold tracking-wide text-[11px]">
                      {node.name}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-mono ${
                      node.isSuccess
                        ? "text-emerald-400 font-bold"
                        : node.isWarning
                        ? "text-amber-400 font-medium"
                        : node.isActive
                        ? "text-razorpay-300 font-medium"
                        : "text-slate-400"
                    }`}
                  >
                    {node.detail}
                  </span>
                </div>

                {!isLast && (
                  <div className="flex justify-start pl-4 py-0.5">
                    <div
                      className={`w-0.5 h-2.5 transition-colors ${
                        node.isComplete ? "bg-emerald-500/40" : "bg-slate-800"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Supervised ML Model Transparency Panel */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 text-xs backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <BrainCircuit className="w-3.5 h-3.5 text-razorpay-400" />
            <span className="text-[11px] tracking-wider uppercase">Recoverability Model</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
            Supervised ML
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mt-2">
          <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
            <div className="text-slate-500 text-[10px] uppercase">Model</div>
            <div className="text-white font-medium">VIREON Recovery Model v1</div>
          </div>
          <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
            <div className="text-slate-500 text-[10px] uppercase">Algorithm</div>
            <div className="text-white font-medium">Logistic Regression</div>
          </div>
          <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
            <div className="text-slate-500 text-[10px] uppercase">Dataset</div>
            <div className="text-white font-medium truncate" title="Synthetic demonstration dataset">
              Synthetic demonstration
            </div>
          </div>
          <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
            <div className="text-slate-500 text-[10px] uppercase">Features</div>
            <div className="text-white font-medium">9 Features</div>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-sans">Recovery Probability</span>
          <span className="text-sm font-bold text-razorpay-400 font-mono">
            {(probability * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
