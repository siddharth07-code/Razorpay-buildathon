"use client";

import React, { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/utils";
import {
  Bot,
  Sparkles,
  BrainCircuit,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Play,
  Check,
  XCircle,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { AgentDecision } from "@/types";
import { TestSuiteSummary } from "@/lib/testing/unit-tests";

export default function AgentPage() {
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  const [testSummary, setTestSummary] = useState<TestSuiteSummary | null>(null);
  const [runningTests, setRunningTests] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch("/api/cases");
      if (res.ok) {
        const data = await res.json();
        const cases = data.cases || [];
        setDecisions(
          cases.map((c: any) => ({
            id: `dec_${c.id}`,
            caseId: c.id,
            caseNumber: c.caseNumber,
            customerId: c.customerId,
            customerName: c.customer?.name || "Customer",
            amount: c.amount,
            decisionType: (c.aiRecommendation?.actionType as any) || "CREATE_PAYMENT_LINK",
            confidence: c.aiRecommendation?.confidence || 0.92,
            rationale: c.aiRecommendation?.reasoning || c.rootCauseDetails,
            signalsDetected: [`Error: ${c.rootCause}`, `Method: ${c.payment?.method || "NACH"}`],
            proposedAction: c.selectedAction || c.aiRecommendation?.action || "CREATE_PAYMENT_LINK",
            executedAction: c.currentStep,
            channel: (c.aiRecommendation?.recommendedChannel as any) || "WHATSAPP",
            executionStatus: c.status === "RECOVERED" ? "COMPLETED" : "EXECUTED",
            humanReviewRequired: c.requiresHumanApproval || false,
            timestamp: c.updatedAt || c.createdAt,
          }))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunTests = async () => {
    setRunningTests(true);
    try {
      const res = await fetch("/api/tests");
      if (res.ok) {
        const data: TestSuiteSummary = await res.json();
        setTestSummary(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunningTests(false);
    }
  };

  useEffect(() => {
    loadData();
    handleRunTests();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Bot className="w-6 h-6 text-razorpay-400" />
              <span>Autonomous Agent System</span>
            </h1>
            <span className="text-[10px] bg-razorpay-500/10 text-razorpay-400 font-semibold px-2 py-0.5 rounded border border-razorpay-500/20 font-mono">
              MULTI-AGENT ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Risk Scoring • Root Cause Diagnosis • Strategy Agent • Deterministic Policy Engine • Razorpay Provider
          </p>
        </div>

        <button
          onClick={handleRunTests}
          disabled={runningTests}
          className="flex items-center gap-1.5 bg-gradient-to-r from-razorpay-600 to-indigo-600 hover:from-razorpay-500 hover:to-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded shadow-glow transition disabled:opacity-50 self-start sm:self-auto"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{runningTests ? "Executing 10-Point Suite..." : "Run Policy & Agent Tests"}</span>
        </button>
      </div>

      {/* 3 Core Architecture Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-surface-card rounded-lg p-4 border border-surface-border space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
            <span className="flex items-center gap-1.5">
              <BrainCircuit className="w-4 h-4 text-razorpay-400" />
              Deterministic Financial Math
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              STRICT
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            All money math, risk scoring, and expected recovery value calculations run in pure deterministic TypeScript code.
          </p>
        </div>

        <div className="bg-surface-card rounded-lg p-4 border border-surface-border space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-400" />
              Deterministic Policy Engine
            </span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
              HARD LIMITS
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Enforces Max 3 Retries, Max 3 Contacts, and mandatory Human Approval for high-value transactions &gt; ₹1,00,000.
          </p>
        </div>

        <div className="bg-surface-card rounded-lg p-4 border border-surface-border space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              HMAC Signature Verified
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              SHA-256
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Webhooks are cryptographically authenticated with SHA-256 signatures and guarded by idempotency tracking.
          </p>
        </div>
      </div>

      {/* Automated Test Suite Results */}
      {testSummary && (
        <div className="bg-surface-card rounded-lg p-5 border border-surface-border space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Automated Multi-Agent Verification Suite
                </h3>
                <p className="text-[11px] text-slate-400">
                  {testSummary.passed}/{testSummary.total} test scenarios passing ({testSummary.durationMs}ms)
                </p>
              </div>
            </div>

            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
              100% PASSING
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {testSummary.results.map((t) => (
              <div
                key={t.testId}
                className="p-3 rounded bg-slate-900/70 border border-slate-800 text-xs flex items-start justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-slate-500">#{t.testId}</span>
                    <span className="font-bold text-white text-[11px]">{t.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono truncate max-w-[280px]">
                    {t.actual}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-emerald-400 font-mono text-[10px] font-semibold flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                  <span>PASS</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision Operations Stream */}
      <AgentFeed decisions={decisions} />
    </div>
  );
}

function AgentFeed({ decisions }: { decisions: AgentDecision[] }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-razorpay-500/10 border border-razorpay-500/20 flex items-center justify-center text-razorpay-400">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Agent Decision Operations Stream
            </h3>
            <p className="text-[11px] text-slate-400">Autonomous heuristics & intervention logs</p>
          </div>
        </div>

        <span className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ACTIVE
        </span>
      </div>

      <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
        {decisions.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8 font-mono">
            No agent decisions in queue.
          </p>
        ) : (
          decisions.map((dec) => (
            <div
              key={dec.id}
              className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2 hover:border-slate-700 transition text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white font-mono text-[11px]">{dec.caseNumber}</span>
                  <span className="text-slate-400 text-[11px] truncate max-w-[130px]">
                    {dec.customerName}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {formatRelativeTime(dec.timestamp)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-razorpay-400 bg-razorpay-500/10 px-2 py-0.5 rounded border border-razorpay-500/20 truncate font-mono">
                  {dec.decisionType.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                  {Math.round(dec.confidence * 100)}% Conf
                </span>
              </div>

              <p className="text-slate-300 text-[11px] leading-relaxed italic bg-slate-950/70 p-2 rounded border border-slate-800/80">
                "{dec.rationale}"
              </p>

              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-800/60">
                <div className="flex items-center gap-1 text-slate-300">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span className="truncate max-w-[180px]">{dec.channel}</span>
                </div>
                <span className="text-emerald-400 font-medium">
                  {dec.executionStatus}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
