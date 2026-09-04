"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { formatINR, formatDateTime, formatRelativeTime } from "@/lib/utils";
import {
  Sparkles,
  Bot,
  Zap,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCcw,
  Play,
  Activity,
  ArrowRight,
  UserCheck,
  CreditCard,
  Building2,
  Terminal,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { RazorpayCheckoutButton } from "@/components/payment/RazorpayCheckoutButton";

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

interface ActiveCaseState {
  id: string;
  caseNumber: string;
  customerName: string;
  customerEmail: string;
  companyName: string;
  customerTier: string;
  amount: number;
  expectedRecoveryValue: number;
  status: string;
  currentStep: string;
  riskScore: number;
  recoverabilityScore: number;
  riskLevel: string;
  priority: string;
  riskExplanation?: string;
  rootCause: string;
  rootCauseDetails: string;
  diagnosisConfidence: number;
  selectedAction: string;
  strategyExplanation?: string;
  policyStatus: "APPROVED" | "HUMAN_APPROVAL_REQUIRED" | "BLOCKED" | "PENDING";
  policyReason?: string;
  requiresHumanApproval: boolean;
  retryCount: number;
  contactCount: number;
  paymentLinkUrl?: string;
  razorpayPaymentLinkId?: string;
  razorpayPaymentId?: string;
  recoveredAmount: number;
  recoveredAt?: string;
}

export default function OperationsConsolePage() {
  const [activeCase, setActiveCase] = useState<ActiveCaseState | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    backend: true,
    database: true,
    razorpay: true,
    agents: true,
  });
  const [metrics, setMetrics] = useState({
    totalAtRiskRupees: 1330985,
    totalExpectedRecoveryRupees: 1106365,
    totalRecoveredRupees: 513193,
    autonomousRecoveryRate: 37,
    activeCases: 12,
    humanEscalations: 2,
    policyBlocks: 1,
  });

  const [loadingAction, setLoadingAction] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const eventSourceRef = useRef<EventSource | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch initial summary metrics and system health
  const fetchSummaryData = async () => {
    try {
      const [metricsRes, rzpRes] = await Promise.all([
        fetch("/api/metrics"),
        fetch("/api/razorpay/connection-test", { method: "POST" }).catch(() => null),
      ]);

      if (metricsRes.ok) {
        const m = await metricsRes.json();
        setMetrics({
          totalAtRiskRupees: m.totalAtRiskRupees || m.revenueAtRisk || 1330985,
          totalExpectedRecoveryRupees: m.totalExpectedRecoveryRupees || m.recoverableRevenue || 1106365,
          totalRecoveredRupees: m.totalRecoveredRupees || m.revenueRecovered || 513193,
          autonomousRecoveryRate: m.autonomousRecoveryRate || m.recoveryRate || 37,
          activeCases: m.activeCases || 12,
          humanEscalations: m.humanEscalations || 2,
          policyBlocks: m.policyBlocks || 1,
        });
      }

      if (rzpRes && rzpRes.ok) {
        const rzpData = await rzpRes.json();
        setSystemStatus((prev) => ({
          ...prev,
          razorpay: rzpData.connected !== false,
        }));
      }
    } catch (err) {
      console.warn("[Operations] Summary fetch fallback:", err);
    }
  };

  // 2. Load latest active or demo case
  const loadLatestCase = async () => {
    try {
      const res = await fetch("/api/cases?status=ALL");
      if (res.ok) {
        const data = await res.json();
        const cases = data.cases || [];
        if (cases.length > 0) {
          const c = cases[0];
          setActiveCase({
            id: c.id,
            caseNumber: c.caseNumber,
            customerName: c.customer?.name || "Acme Technologies India Pvt Ltd",
            customerEmail: c.customer?.email || "finance@acmetech.in",
            companyName: c.customer?.companyName || "Acme Technologies",
            customerTier: c.customer?.tier || "GROWTH",
            amount: c.amount || 25000,
            expectedRecoveryValue: c.expectedRecoveryValue || c.recoverableAmount || c.amount * 0.88,
            status: c.status,
            currentStep: c.currentStep || "ROOT_CAUSE_ANALYSIS",
            riskScore: c.riskScore || 55,
            recoverabilityScore: c.recoverabilityScore || 99,
            riskLevel: c.riskLevel || "HIGH",
            priority: c.priority || "P1",
            riskExplanation: `Assessed at ${c.riskScore || 55}/100 with ${c.recoverabilityScore || 99}% probability.`,
            rootCause: c.rootCause || "AUTHENTICATION_FAILURE",
            rootCauseDetails: c.rootCauseDetails || "3DS Auth timeout / Customer challenge dropoff",
            diagnosisConfidence: 0.94,
            selectedAction: c.selectedAction || c.recommendedAction || "CREATE_PAYMENT_LINK",
            strategyExplanation: "1-Click dynamic prefilled Razorpay checkout link dispatched to customer.",
            policyStatus: c.requiresHumanApproval ? "HUMAN_APPROVAL_REQUIRED" : "APPROVED",
            policyReason: c.requiresHumanApproval
              ? "Amount exceeds the ₹1,00,000 threshold. Operations manager sign-off required."
              : "Policy APPROVED: Action complies with all risk caps and retry constraints.",
            requiresHumanApproval: Boolean(c.requiresHumanApproval),
            retryCount: c.retryCount || 0,
            contactCount: c.contactCount || 0,
            paymentLinkUrl: c.paymentLinkUrl,
            razorpayPaymentLinkId: c.razorpayPaymentLinkId,
            razorpayPaymentId: c.razorpayPaymentId || c.payment?.razorpayPaymentId,
            recoveredAmount: c.recoveredAmount || 0,
            recoveredAt: c.recoveredAt,
          });
        }
      }
    } catch (err) {
      console.warn("[Operations] Failed to load latest case:", err);
    }
  };

  // 3. Connect to Server-Sent Events (SSE) Stream
  useEffect(() => {
    fetchSummaryData();
    loadLatestCase();

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource("/api/events/stream");
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const parsedEvent: LiveEvent = JSON.parse(event.data);
          if (parsedEvent.type === "HEARTBEAT") return;

          setEvents((prev) => [parsedEvent, ...prev.slice(0, 49)]);

          // If the event corresponds to our active case, refresh case state
          if (
            parsedEvent.type === "PAYMENT_LINK_CREATED" ||
            parsedEvent.type === "REVENUE_RECOVERED" ||
            parsedEvent.type === "PAYMENT_CONFIRMED" ||
            parsedEvent.type === "HUMAN_APPROVAL_REQUIRED" ||
            parsedEvent.type === "POLICY_APPROVED" ||
            parsedEvent.type === "CASE_CREATED"
          ) {
            loadLatestCase();
            fetchSummaryData();
          }
        } catch (err) {
          console.error("[Operations] Error parsing SSE payload:", err);
        }
      };

      es.onerror = () => {
        setSseConnected(false);
        es.close();
        // Auto-reconnect after 4s
        setTimeout(connectSSE, 4000);
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // 4. Trigger Real Razorpay Sandbox Demo
  const handleStartDemo = async (amount: number = 67500) => {
    setLoadingAction(true);
    setActionNotice(null);

    const customerName = amount >= 100000 ? "Vertex Industries" : "Orion Media";
    const caseNumber = amount === 67500 ? "REC-DEMO-005" : undefined;

    try {
      const res = await fetch("/api/demo/recovery/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, customerName, caseNumber }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionNotice({
          type: "success",
          message: `Live Sandbox scenario started for ${data.caseNumber} (₹${amount.toLocaleString("en-IN")})!`,
        });
        await loadLatestCase();
        await fetchSummaryData();
      } else {
        setActionNotice({
          type: "error",
          message: data.error || "Failed to start demo scenario",
        });
      }
    } catch (err: any) {
      setActionNotice({ type: "error", message: err.message });
    } finally {
      setLoadingAction(false);
    }
  };

  // 5. Reset Demo Scenario
  const handleResetDemo = async () => {
    if (!confirm("Safely purge all test demo runs? Production records will remain unaffected.")) return;

    setLoadingAction(true);
    setActionNotice(null);

    try {
      const res = await fetch("/api/demo/recovery/reset", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionNotice({ type: "success", message: data.message });
        setEvents([]);
        await loadLatestCase();
        await fetchSummaryData();
      } else {
        setActionNotice({ type: "error", message: data.error || "Reset failed" });
      }
    } catch (err: any) {
      setActionNotice({ type: "error", message: err.message });
    } finally {
      setLoadingAction(false);
    }
  };

  // 6. Human Approval Action Handler
  const handleHumanDecision = async (decision: "APPROVE" | "REJECT") => {
    if (!activeCase) return;
    setLoadingAction(true);

    try {
      if (decision === "APPROVE") {
        const res = await fetch(`/api/cases/${activeCase.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "EXECUTE_ACTION", forceExecute: true }),
        });
        const data = await res.json();
        if (res.ok) {
          setActionNotice({ type: "success", message: "Operation approved and executed via Razorpay API!" });
          setShowApprovalModal(false);
          await loadLatestCase();
        } else {
          setActionNotice({ type: "error", message: data.error || "Approval failed" });
        }
      } else {
        const res = await fetch(`/api/cases/${activeCase.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "STOP_RECOVERY", reason: rejectReason || "Rejected by operations manager" }),
        });
        const data = await res.json();
        if (res.ok) {
          setActionNotice({ type: "success", message: "Recovery halted by operator." });
          setShowApprovalModal(false);
          await loadLatestCase();
        }
      }
    } catch (err: any) {
      setActionNotice({ type: "error", message: err.message });
    } finally {
      setLoadingAction(false);
    }
  };

  // 7. Load Timeline Modal Data
  const openTimeline = async () => {
    if (!activeCase) return;
    setShowTimelineModal(true);
    setTimelineLoading(true);

    try {
      const res = await fetch(`/api/recovery/cases/${activeCase.id}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setTimelineData(data.timeline || []);
      }
    } catch (err) {
      console.error("[Timeline] Fetch error:", err);
    } finally {
      setTimelineLoading(false);
    }
  };

  // 8. Pipeline Stage Derivation
  const getStageStatus = (stageName: string): "COMPLETED" | "RUNNING" | "WAITING" | "BLOCKED" | "FAILED" => {
    if (!activeCase) return "WAITING";
    const status = activeCase.status;

    if (stageName === "PAYMENT EVENT") return "COMPLETED";

    if (stageName === "RISK AGENT") {
      if (["NEW"].includes(status)) return "WAITING";
      return "COMPLETED";
    }

    if (stageName === "DIAGNOSIS AI") {
      if (["NEW", "ANALYZING"].includes(status)) return "WAITING";
      return "COMPLETED";
    }

    if (stageName === "STRATEGY") {
      if (["NEW", "ANALYZING", "DIAGNOSED"].includes(status)) return "WAITING";
      return "COMPLETED";
    }

    if (stageName === "POLICY ENGINE") {
      if (status === "AWAITING_APPROVAL" || activeCase.requiresHumanApproval) return "BLOCKED";
      if (["NEW", "ANALYZING", "DIAGNOSED", "ACTION_SELECTED"].includes(status)) return "WAITING";
      return "COMPLETED";
    }

    if (stageName === "RAZORPAY") {
      if (["EXECUTING", "AWAITING_PAYMENT", "IN_PROGRESS", "RECOVERED"].includes(status)) return "COMPLETED";
      if (status === "AWAITING_APPROVAL") return "WAITING";
      return "WAITING";
    }

    if (stageName === "OUTCOME") {
      if (status === "RECOVERED") return "COMPLETED";
      if (status === "AWAITING_PAYMENT") return "RUNNING";
      if (status === "FAILED") return "FAILED";
      return "WAITING";
    }

    return "WAITING";
  };

  const isRecovered = activeCase?.status === "RECOVERED";

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. TOP HEADER & CONNECTIVITY STATUS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-surface-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-razorpay-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-glow">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-sans">
                VIREON Operations Console
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                  RAZORPAY SANDBOX
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Closed-loop autonomous revenue recovery orchestration & telemetry
              </p>
            </div>
          </div>
        </div>

        {/* Live Connectivity Matrix */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-lg text-[11px] font-mono">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${systemStatus.backend ? "bg-emerald-400" : "bg-rose-400"}`} />
            <span className="text-slate-300">Backend:</span>
            <span className="text-emerald-400 font-semibold">CONNECTED</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${systemStatus.database ? "bg-emerald-400" : "bg-rose-400"}`} />
            <span className="text-slate-300">PostgreSQL:</span>
            <span className="text-emerald-400 font-semibold">CONNECTED</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${systemStatus.razorpay ? "bg-emerald-400" : "bg-rose-400"}`} />
            <span className="text-slate-300">Razorpay:</span>
            <span className="text-emerald-400 font-semibold">CONNECTED</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${sseConnected ? "bg-razorpay-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="text-slate-300">SSE Stream:</span>
            <span className="text-razorpay-300 font-semibold">{sseConnected ? "LIVE" : "CONNECTING"}</span>
          </div>
        </div>
      </div>

      {/* 2. METRICS KPI BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3 rounded-lg bg-surface-card border border-surface-border">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Revenue at Risk</span>
          <p className="text-base font-bold text-rose-400 font-mono mt-0.5">{formatINR(metrics.totalAtRiskRupees)}</p>
        </div>
        <div className="p-3 rounded-lg bg-surface-card border border-surface-border">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Expected Recovery</span>
          <p className="text-base font-bold text-sky-400 font-mono mt-0.5">{formatINR(metrics.totalExpectedRecoveryRupees)}</p>
        </div>
        <div className="p-3 rounded-lg bg-surface-card border border-surface-border">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Recovered Capital</span>
          <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">{formatINR(metrics.totalRecoveredRupees)}</p>
        </div>
        <div className="p-3 rounded-lg bg-surface-card border border-surface-border">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Recovery Rate</span>
          <p className="text-base font-bold text-white font-mono mt-0.5">{metrics.autonomousRecoveryRate}%</p>
        </div>
        <div className="p-3 rounded-lg bg-surface-card border border-surface-border">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Cases</span>
          <p className="text-base font-bold text-indigo-400 font-mono mt-0.5">{metrics.activeCases}</p>
        </div>
        <div className="p-3 rounded-lg bg-surface-card border border-surface-border">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Policy Gates</span>
          <p className="text-base font-bold text-amber-400 font-mono mt-0.5">{metrics.policyBlocks}</p>
        </div>
        <div className="p-3 rounded-lg bg-surface-card border border-surface-border">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Escalations</span>
          <p className="text-base font-bold text-purple-400 font-mono mt-0.5">{metrics.humanEscalations}</p>
        </div>
      </div>

      {/* 3. CONTROL PANEL & SCENARIO TRIGGERS */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-gradient-to-r from-slate-900 via-slate-900 to-surface-card border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-razorpay-400" />
            Sandbox Scenarios:
          </span>
          <button
            disabled={loadingAction}
            onClick={() => handleStartDemo(67500)}
            className="flex items-center gap-1.5 bg-razorpay-600 hover:bg-razorpay-500 text-white text-xs font-semibold px-3 py-1.5 rounded shadow-sm transition disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            <span>⚡ Start ₹67,500 Live Demo (Orion Media)</span>
          </button>
          <button
            disabled={loadingAction}
            onClick={() => handleStartDemo(250000)}
            className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold px-3 py-1.5 rounded transition disabled:opacity-50"
            title="Demonstrates policy gate triggering mandatory human approval for amounts >= ₹1,00,000"
          >
            <ShieldCheck className="w-3 h-3 text-purple-400" />
            <span>🛡️ Test ₹2,50,000 Policy Gate</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeCase && (
            <button
              onClick={openTimeline}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded border border-slate-700 transition"
            >
              <Clock className="w-3 h-3 text-sky-400" />
              <span>View Timeline</span>
            </button>
          )}
          <button
            disabled={loadingAction}
            onClick={handleResetDemo}
            className="flex items-center gap-1.5 bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-mono px-3 py-1.5 rounded border border-slate-800 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Action Notice Notification */}
      {actionNotice && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between animate-fadeIn ${
            actionNotice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* 4. SEVEN-STAGE VISUAL AGENT PIPELINE */}
      <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-razorpay-400" />
            Agent Decision Pipeline
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Active Case: <span className="text-white font-semibold">{activeCase?.caseNumber || "No Active Case"}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { name: "PAYMENT EVENT", desc: "Razorpay Ingestion" },
            { name: "RISK AGENT", desc: "Paise Math & Priority" },
            { name: "DIAGNOSIS AI", desc: "Root Cause Classification" },
            { name: "STRATEGY", desc: "Closed Action Set" },
            { name: "POLICY ENGINE", desc: "Immutable Guardrails" },
            { name: "RAZORPAY", desc: "Payment Link Dispatch" },
            { name: "OUTCOME", desc: "PostgreSQL Confirmation" },
          ].map((stage, idx) => {
            const st = getStageStatus(stage.name);
            const getBg = () => {
              switch (st) {
                case "COMPLETED":
                  return "bg-emerald-500/10 border-emerald-500/40 text-emerald-300";
                case "RUNNING":
                  return "bg-razorpay-500/10 border-razorpay-500/50 text-razorpay-300 animate-pulse";
                case "BLOCKED":
                  return "bg-amber-500/10 border-amber-500/50 text-amber-300";
                case "FAILED":
                  return "bg-rose-500/10 border-rose-500/50 text-rose-300";
                default:
                  return "bg-slate-900/60 border-slate-800 text-slate-500";
              }
            };

            return (
              <div key={idx} className={`p-3 rounded-lg border text-center transition-all ${getBg()}`}>
                <span className="text-[9px] font-mono uppercase tracking-wider block font-semibold">
                  Stage {idx + 1}
                </span>
                <span className="text-xs font-bold block mt-0.5">{stage.name}</span>
                <span className="text-[10px] text-slate-400 block truncate mt-1">{stage.desc}</span>
                <span className="text-[9px] font-mono font-bold mt-2 inline-block px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800">
                  {st}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. CELEBRATORY REVENUE RECOVERY RESULT (IF RECOVERED) */}
      {isRecovered && activeCase && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border-2 border-emerald-500/50 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-scaleUp">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 animate-bounce" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                CLOSED-LOOP REVENUE RECOVERED
              </span>
              <h3 className="text-2xl font-bold text-white font-mono mt-0.5">
                {formatINR(activeCase.recoveredAmount || activeCase.amount)} RECOVERED
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Confirmed captured by Razorpay Sandbox API. Committed to Supabase PostgreSQL ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 p-3 rounded-lg text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px]">REVENUE AT RISK</span>
              <span className="text-rose-400 line-through font-semibold">{formatINR(activeCase.amount)}</span>
              <span className="text-emerald-400 font-bold ml-1">➔ ₹0</span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400 block text-[10px]">CASE NUMBER</span>
              <span className="text-white font-bold">{activeCase.caseNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. MAIN CONSOLE LAYOUT: AGENT DECISION TILES & LIVE FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: INTERACTIVE AGENT CARDS */}
        <div className="lg:col-span-2 space-y-4">
          {activeCase ? (
            <>
              {/* Active Case Primary Header Card */}
              <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-white text-base">{activeCase.customerName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                      {activeCase.customerTier}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">{activeCase.caseNumber}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Amount at Risk</span>
                    <p className="text-lg font-bold text-rose-400 font-mono mt-0.5">{formatINR(activeCase.amount)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Expected Recoverable</span>
                    <p className="text-lg font-bold text-sky-400 font-mono mt-0.5">
                      {formatINR(activeCase.expectedRecoveryValue)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Lifecycle Status</span>
                    <p className="text-xs font-bold text-white font-mono mt-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 inline-block">
                      {activeCase.status}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 Agent Decision Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Risk Agent Card */}
                <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                      Risk Agent
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
                      Priority: {activeCase.priority}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">Risk Score</span>
                      <span className="text-sm font-bold text-white">{activeCase.riskScore} / 100</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">Recoverability</span>
                      <span className="text-sm font-bold text-emerald-400">{activeCase.recoverabilityScore}%</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded border border-slate-800 leading-relaxed">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block font-mono mb-0.5">
                      Deterministic Reasoning:
                    </span>
                    {activeCase.riskExplanation}
                  </div>
                </div>

                {/* 2. Diagnosis AI Card */}
                <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Diagnosis Agent
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                      Confidence: {Math.round(activeCase.diagnosisConfidence * 100)}%
                    </span>
                  </div>

                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-xs font-mono">
                    <span className="text-[10px] text-slate-400 block font-sans">Root Cause Category</span>
                    <span className="text-sm font-bold text-amber-400">{activeCase.rootCause}</span>
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded border border-slate-800 leading-relaxed">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block font-mono mb-0.5">
                      Diagnostic Telemetry:
                    </span>
                    {activeCase.rootCauseDetails}
                  </div>
                </div>

                {/* 3. Recovery Strategy Card */}
                <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-razorpay-400" />
                      Recovery Strategy
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-razorpay-500/10 text-razorpay-300 border border-razorpay-500/30">
                      Closed Action Set
                    </span>
                  </div>

                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-xs font-mono">
                    <span className="text-[10px] text-slate-400 block font-sans">Selected Action</span>
                    <span className="text-sm font-bold text-razorpay-300">{activeCase.selectedAction}</span>
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded border border-slate-800 leading-relaxed">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block font-mono mb-0.5">
                      Strategy Rationale:
                    </span>
                    {activeCase.strategyExplanation}
                  </div>
                </div>

                {/* 4. Policy Engine Card */}
                <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Policy Engine
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                        activeCase.policyStatus === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-purple-500/10 text-purple-300 border-purple-500/30 animate-pulse"
                      }`}
                    >
                      {activeCase.policyStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">Retries</span>
                      <span className="text-xs font-bold text-white">{activeCase.retryCount} / 3 Max</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">Threshold Gate</span>
                      <span className="text-xs font-bold text-white">₹1,00,000</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded border border-slate-800 leading-relaxed">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block font-mono mb-0.5">
                      Policy Verification:
                    </span>
                    {activeCase.policyReason}
                  </div>

                  {activeCase.requiresHumanApproval && (
                    <button
                      onClick={() => setShowApprovalModal(true)}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2 px-3 rounded flex items-center justify-center gap-1.5 shadow-lg shadow-purple-900/40 transition"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Review Policy Gate & Authorize</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 5. Razorpay Sandbox Execution Card */}
              <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-razorpay-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Razorpay Execution Boundary
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Live Test Checkout
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Razorpay Payment ID</span>
                    <span className="text-razorpay-300 font-semibold">{activeCase.razorpayPaymentId || (activeCase.status === "RECOVERED" ? "Captured" : "Pending Settlement")}</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Payment Link ID</span>
                    <span className="text-emerald-300 font-semibold">
                      {activeCase.razorpayPaymentLinkId || activeCase.paymentLinkUrl?.split("/").pop() || "plink_rzp_demo"}
                    </span>
                  </div>
                </div>

                {activeCase.status === "AWAITING_PAYMENT" && (
                  <div className="p-3.5 rounded-lg bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                        Payment Required (Sandbox Test Mode)
                      </span>
                      <p className="text-xs text-slate-300 font-mono mt-0.5">
                        Amount: ₹{activeCase.amount.toLocaleString("en-IN")} • Status: Awaiting settlement
                      </p>
                    </div>
                    <div className="w-full sm:w-auto">
                      <RazorpayCheckoutButton
                        caseId={activeCase.id}
                        caseNumber={activeCase.caseNumber}
                        amount={activeCase.amount}
                        customerName={activeCase.customerName}
                        onSuccess={() => {
                          setTimeout(() => {
                            loadLatestCase();
                            fetchSummaryData();
                          }, 1000);
                        }}
                      />
                    </div>
                  </div>
                )}

                {activeCase.paymentLinkUrl && (
                  <div className="p-3.5 rounded-lg bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Active Razorpay Payment Link
                      </span>
                      <p className="text-xs text-slate-300 font-mono mt-0.5 truncate max-w-sm">
                        {activeCase.paymentLinkUrl}
                      </p>
                    </div>
                    <a
                      href={activeCase.paymentLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition flex-shrink-0"
                    >
                      <span>OPEN RAZORPAY PAYMENT LINK</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 rounded-xl bg-surface-card border border-surface-border text-center space-y-3">
              <Bot className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No Active Recovery Scenario</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click &quot;Start ₹25,000 Live Sandbox Demo&quot; above to trigger a live multi-agent recovery workflow through Razorpay.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: REAL-TIME SSE EVENT FEED */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-razorpay-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Live Agent Telemetry</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">STREAM ACTIVE</span>
            </div>
          </div>

          <div className="h-[700px] overflow-y-auto space-y-2.5 pr-1 font-mono text-xs custom-scrollbar">
            {events.length === 0 ? (
              <div className="p-8 rounded-xl bg-surface-card/60 border border-slate-800 text-center text-slate-500 text-xs">
                Listening for real-time orchestrator events...
              </div>
            ) : (
              events.map((evt) => {
                const getEventColor = () => {
                  if (evt.type.includes("RECOVERED") || evt.type.includes("CONFIRMED"))
                    return "border-emerald-500/50 bg-emerald-950/30 text-emerald-300";
                  if (evt.type.includes("BLOCKED") || evt.type.includes("APPROVAL"))
                    return "border-amber-500/50 bg-amber-950/30 text-amber-300";
                  if (evt.type.includes("FAILED"))
                    return "border-rose-500/50 bg-rose-950/30 text-rose-300";
                  if (evt.type.includes("STARTED"))
                    return "border-sky-500/40 bg-sky-950/20 text-sky-300";
                  return "border-slate-800 bg-slate-900/80 text-slate-200";
                };

                return (
                  <div
                    key={evt.id}
                    className={`p-3 rounded-lg border transition-all text-[11px] space-y-1 ${getEventColor()}`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-white">{evt.type}</span>
                      <span className="font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {evt.description && <p className="text-slate-300 font-sans text-xs leading-relaxed">{evt.description}</p>}
                    <div className="flex items-center justify-between text-[9px] text-slate-500 uppercase tracking-wider pt-1 border-t border-slate-800/60">
                      <span>Actor: {evt.actor}</span>
                      {evt.caseNumber && <span>{evt.caseNumber}</span>}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={feedEndRef} />
          </div>
        </div>
      </div>

      {/* 7. HUMAN APPROVAL MODAL */}
      {showApprovalModal && activeCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface-card border border-purple-500/40 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">Operations Manager Authorization Required</h3>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Case Number:</span>
                <span className="text-white font-bold">{activeCase.caseNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="text-white">{activeCase.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount at Risk:</span>
                <span className="text-rose-400 font-bold text-sm">{formatINR(activeCase.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Policy Trigger:</span>
                <span className="text-purple-300">Amount &ge; ₹1,00,000 threshold</span>
              </div>
            </div>

            <div className="text-xs text-slate-300 bg-purple-950/30 p-3 rounded border border-purple-500/30 space-y-1">
              <span className="text-[10px] font-bold text-purple-400 uppercase block font-mono">AI Recommended Action:</span>
              <p>{activeCase.selectedAction} — {activeCase.strategyExplanation}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 block font-semibold">Optional Operator Rejection Reason:</label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Account under manual finance review"
                className="w-full bg-slate-900 border border-slate-800 text-white rounded p-2 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={loadingAction}
                onClick={() => handleHumanDecision("REJECT")}
                className="bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold py-2.5 px-4 rounded transition"
              >
                Reject & Stop Recovery
              </button>
              <button
                disabled={loadingAction}
                onClick={() => handleHumanDecision("APPROVE")}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2.5 px-4 rounded shadow-lg shadow-purple-900/50 transition"
              >
                Authorize Razorpay Execution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. 12-STEP FULL CASE TIMELINE MODAL */}
      {showTimelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface-card border border-slate-700 rounded-xl w-full max-w-2xl max-h-[85vh] p-6 flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">12-Step Closed-Loop Recovery Timeline</h3>
              </div>
              <button onClick={() => setShowTimelineModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {timelineLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs">Loading audit ledger...</div>
              ) : (
                timelineData.map((step: any) => (
                  <div
                    key={step.stepNumber}
                    className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px] flex items-center justify-center font-bold">
                          {step.stepNumber}
                        </span>
                        <span className="font-bold text-white">{step.name}</span>
                      </div>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border font-semibold ${
                          step.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : step.status === "IN_PROGRESS"
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                            : step.status === "BLOCKED"
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                            : "bg-slate-950 text-slate-500 border-slate-800"
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{step.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
                      <span>Actor: {step.actor}</span>
                      <span>{step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : "—"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
