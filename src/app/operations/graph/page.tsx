"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Network,
  Bot,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  StopCircle,
  HelpCircle,
  ArrowRight,
  Terminal,
  Activity,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react";

export default function GraphVisualizerPage() {
  const [topology, setTopology] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<string>("risk");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recovery/graph")
      .then((r) => r.json())
      .then((data) => {
        setTopology(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const nodeDetails: { [key: string]: { title: string; type: string; description: string; handler: string; inputs: string[]; outputs: string[] } } = {
    START: {
      title: "Recovery Event Trigger",
      type: "Entrypoint",
      description: "Triggered on Razorpay payment failure event or webhook ingestion.",
      handler: "LangGraph StateGraph Entry",
      inputs: ["Payment Failed Event", "Webhook Payload"],
      outputs: ["Initial Graph State"],
    },
    risk: {
      title: "Risk Scoring Agent",
      type: "AI Agent",
      description: "Calculates recoverability percentage (0-100), expected recovery value in integer paise, and priority rank.",
      handler: "RiskService.evaluateRisk()",
      inputs: ["amountAtRiskPaise", "customerLTV", "paymentHistory"],
      outputs: ["riskScore", "recoverabilityScore", "expectedRecoveryValuePaise", "priority"],
    },
    diagnosis: {
      title: "Root Cause Diagnosis AI",
      type: "AI Agent",
      description: "Performs diagnostic telemetry classification across 10 error categories with confidence scoring.",
      handler: "DiagnosisService.diagnose()",
      inputs: ["errorCode", "errorDescription", "paymentMethod"],
      outputs: ["rootCause", "diagnosisConfidence", "diagnosisSummary"],
    },
    strategy: {
      title: "Recovery Strategy Agent",
      type: "AI Agent",
      description: "Selects optimal intervention from closed recovery action set (e.g. 1-Click Payment Link vs Smart Mandate Retry).",
      handler: "StrategyService.formulateStrategy()",
      inputs: ["rootCause", "amountAtRisk", "customerTier", "retryCount"],
      outputs: ["selectedAction", "strategyConfidence", "strategyRationale"],
    },
    policy: {
      title: "Deterministic Policy Engine",
      type: "Guardrail Gate",
      description: "Strict deterministic rules (3 max retries, 12h cooldown, >= ₹1,00,000 human approval threshold). LLM cannot bypass.",
      handler: "PolicyService.evaluatePolicy()",
      inputs: ["selectedAction", "amountAtRiskPaise", "retryCount"],
      outputs: ["policyDecision (APPROVED / BLOCKED / HUMAN_APPROVAL_REQUIRED)"],
    },
    humanApproval: {
      title: "Human-in-the-Loop Approval",
      type: "Workflow Interrupt",
      description: "Suspends graph execution for high-value enterprise cases until operations manager signs off.",
      handler: "LangGraph Interrupt & Checkpoint",
      inputs: ["isApprovedByHuman", "humanOperator"],
      outputs: ["policyDecision: APPROVED -> execution", "policyDecision: BLOCKED -> stop"],
    },
    execution: {
      title: "Razorpay Execution Boundary",
      type: "Action Boundary",
      description: "The ONLY authorized layer to dispatch external Razorpay API calls (e.g. createPaymentLink).",
      handler: "ExecutionService.executeAction()",
      inputs: ["caseId", "selectedAction", "customerMetadata"],
      outputs: ["paymentLinkUrl", "razorpayReference", "executionStatus"],
    },
    outcome: {
      title: "Outcome Verification Service",
      type: "Evaluation",
      description: "Verifies HMAC-SHA256 signed Razorpay webhooks and commits financial recovery to PostgreSQL.",
      handler: "OutcomeService.confirmRecovery()",
      inputs: ["razorpayPaymentId", "amountCapturedPaise"],
      outputs: ["recoveredAmountPaise", "paymentStatus: CAPTURED"],
    },
    retry: {
      title: "Bounded Retry Scheduler",
      type: "Safety Loop",
      description: "Ensures retry count < 3 and respects 12h cooldown interval before re-entering policy node.",
      handler: "State Machine Safety Loop",
      inputs: ["retryCount", "lastAttemptTimestamp"],
      outputs: ["retryCount + 1 -> policy", "retryCount >= 3 -> escalation"],
    },
    escalation: {
      title: "Operations Escalation Queue",
      type: "Terminal State",
      description: "Flags case for manual finance team investigation when max attempts are exceeded.",
      handler: "Escalation Dispatcher",
      inputs: ["failureReason", "caseAuditHistory"],
      outputs: ["status: ESCALATED"],
    },
    stop: {
      title: "Safe Recovery Halt",
      type: "Terminal State",
      description: "Safely terminates recovery when blocked by policy or operator rejection.",
      handler: "Policy Halt Handler",
      inputs: ["policyReason"],
      outputs: ["status: STOPPED"],
    },
    complete: {
      title: "Recovery Finalized",
      type: "Success Terminal",
      description: "Marks workflow complete with full PostgreSQL financial ledger reconciliation.",
      handler: "Workflow Finalizer",
      inputs: ["recoveredAmountPaise"],
      outputs: ["status: RECOVERED", "auditComplete: true"],
    },
  };

  const selected = nodeDetails[selectedNode] || nodeDetails.risk;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 via-indigo-600 to-razorpay-600 flex items-center justify-center shadow-glow">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight font-sans flex items-center gap-2">
              LangGraph StateGraph Architecture
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400 font-semibold">
                AGENTIC ORCHESTRATION
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Deterministic workflow state machine, bounded retry loops, and human-in-the-loop interrupts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/operations"
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Activity className="w-3.5 h-3.5 text-razorpay-400" />
            Live Operations Console
          </Link>
        </div>
      </div>

      {/* 2. MAIN GRAPH INTERACTIVE CANVAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Graph Topology Canvas */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-surface-card border border-surface-border space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                StateGraph Topology (11 Nodes &amp; Conditional Edges)
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Click any node to inspect</span>
          </div>

          {/* Node Flow Grid */}
          <div className="space-y-4 font-mono text-xs">
            {/* Row 1: Ingestion & AI Agents */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: "START", label: "START", sub: "Trigger", color: "border-slate-700 bg-slate-900" },
                { id: "risk", label: "risk", sub: "Risk Agent", color: "border-sky-500/40 bg-sky-950/30 text-sky-300" },
                { id: "diagnosis", label: "diagnosis", sub: "Diagnosis AI", color: "border-purple-500/40 bg-purple-950/30 text-purple-300" },
                { id: "strategy", label: "strategy", sub: "Strategy Agent", color: "border-indigo-500/40 bg-indigo-950/30 text-indigo-300" },
              ].map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNode(n.id)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    selectedNode === n.id ? "ring-2 ring-purple-400 scale-[1.02]" : "hover:border-slate-600"
                  } ${n.color}`}
                >
                  <span className="block font-bold text-xs">{n.label}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{n.sub}</span>
                </button>
              ))}
            </div>

            {/* Down Arrow */}
            <div className="flex justify-center text-slate-600">
              <ArrowRight className="w-4 h-4 rotate-90" />
            </div>

            {/* Row 2: Policy & Conditional Gates */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "policy", label: "policy", sub: "Deterministic Gate", color: "border-amber-500/40 bg-amber-950/30 text-amber-300" },
                { id: "humanApproval", label: "humanApproval", sub: "Interrupt (>= ₹1L)", color: "border-rose-500/40 bg-rose-950/30 text-rose-300" },
                { id: "stop", label: "stop", sub: "Safe Halt", color: "border-slate-700 bg-slate-900 text-slate-400" },
              ].map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNode(n.id)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    selectedNode === n.id ? "ring-2 ring-purple-400 scale-[1.02]" : "hover:border-slate-600"
                  } ${n.color}`}
                >
                  <span className="block font-bold text-xs">{n.label}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{n.sub}</span>
                </button>
              ))}
            </div>

            {/* Down Arrow */}
            <div className="flex justify-center text-slate-600">
              <ArrowRight className="w-4 h-4 rotate-90" />
            </div>

            {/* Row 3: Action & Outcomes */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: "execution", label: "execution", sub: "Razorpay Boundary", color: "border-razorpay-500/40 bg-razorpay-950/30 text-razorpay-300" },
                { id: "outcome", label: "outcome", sub: "Outcome Verify", color: "border-teal-500/40 bg-teal-950/30 text-teal-300" },
                { id: "retry", label: "retry", sub: "Loop (< 3)", color: "border-amber-500/40 bg-amber-950/30 text-amber-300" },
                { id: "complete", label: "complete", sub: "Revenue Recovered", color: "border-emerald-500/40 bg-emerald-950/30 text-emerald-300" },
              ].map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNode(n.id)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    selectedNode === n.id ? "ring-2 ring-purple-400 scale-[1.02]" : "hover:border-slate-600"
                  } ${n.color}`}
                >
                  <span className="block font-bold text-xs">{n.label}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{n.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Architecture Guardrails Legend */}
          <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-2 font-mono">
            <span className="text-[11px] font-bold text-white uppercase block">
              Architectural Guardrails &amp; Invariants:
            </span>
            <ul className="text-slate-400 space-y-1 list-disc list-inside text-[11px]">
              <li>
                <strong className="text-slate-200">Bounded Retries:</strong> Max 3 attempts before routing to <code className="text-rose-400">escalation</code> terminal state.
              </li>
              <li>
                <strong className="text-slate-200">Execution Isolation:</strong> Only <code className="text-razorpay-400">execution</code> node can call Razorpay APIs. LLM has zero direct execution tools.
              </li>
              <li>
                <strong className="text-slate-200">Human-in-the-Loop:</strong> Transactions &ge; ₹1,00,000 suspend at <code className="text-rose-400">humanApproval</code> node with checkpoint persistence.
              </li>
            </ul>
          </div>
        </div>

        {/* Right Col: Node Inspector Panel */}
        <div className="p-6 rounded-xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block">
                {selected.type}
              </span>
              <h3 className="text-base font-bold text-white font-mono mt-0.5">{selected.title}</h3>
            </div>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-400">
              node: {selectedNode}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{selected.description}</p>

          <div className="space-y-3 pt-2 font-mono text-xs">
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Underlying Service</span>
              <span className="text-razorpay-400 font-bold text-xs">{selected.handler}</span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Inputs From State</span>
              <div className="flex flex-wrap gap-1.5">
                {selected.inputs.map((inp, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                    {inp}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">State Mutations</span>
              <div className="flex flex-wrap gap-1.5">
                {selected.outputs.map((out, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300">
                    {out}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
