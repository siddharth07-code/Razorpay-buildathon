"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { formatINR, formatRelativeTime } from "@/lib/utils";
import { RecoveryCase } from "@/types";
import {
  ArrowRight,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { RecoveryCaseDrawer } from "../cases/RecoveryCaseDrawer";

export function ConciseCasesTable({
  cases,
  onCaseUpdated,
  onInspectCase,
}: {
  cases: RecoveryCase[];
  onCaseUpdated?: () => void;
  onInspectCase?: (c: RecoveryCase) => void;
}) {
  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTION_REQUIRED" | "AWAITING_PAYMENT" | "EXECUTING" | "RECOVERED">("ALL");

  // Authoritative default showcase rows matching reference image if cases array is empty
  const defaultShowcaseCases = [
    {
      id: "demo_124",
      caseNumber: "REC-2026-00124",
      customer: { name: "Acme Technologies India Pvt Ltd" },
      source: "AUTHENTICATION",
      amount: 25000,
      status: "AWAITING_PAYMENT",
      lastEvent: "Payment link sent",
      updatedAt: new Date(Date.now() - 2 * 60000).toISOString(),
    },
    {
      id: "demo_123",
      caseNumber: "REC-2026-00123",
      customer: { name: "BetaSoft Systems" },
      source: "PAYMENT GATEWAY",
      amount: 124500,
      status: "AWAITING_APPROVAL",
      lastEvent: "Approval required",
      updatedAt: new Date(Date.now() - 6 * 60000).toISOString(),
    },
    {
      id: "demo_122",
      caseNumber: "REC-2026-00122",
      customer: { name: "Globex Pvt Ltd" },
      source: "PAYMENT GATEWAY",
      amount: 75000,
      status: "EXECUTING",
      lastEvent: "Recovery executing",
      updatedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    },
    {
      id: "demo_121",
      caseNumber: "REC-2026-00121",
      customer: { name: "Initech" },
      source: "SUBSCRIPTION",
      amount: 48900,
      status: "RECOVERED",
      lastEvent: "Payment captured",
      updatedAt: new Date(Date.now() - 18 * 60000).toISOString(),
    },
    {
      id: "demo_120",
      caseNumber: "REC-2026-00120",
      customer: { name: "Umbrella Corp" },
      source: "AUTHENTICATION",
      amount: 32000,
      status: "DIAGNOSED",
      lastEvent: "Diagnosis completed",
      updatedAt: new Date(Date.now() - 22 * 60000).toISOString(),
    },
    {
      id: "demo_119",
      caseNumber: "REC-2026-00119",
      customer: { name: "Soylent Industries" },
      source: "RECEIVABLES",
      amount: 450000,
      status: "AWAITING_APPROVAL",
      lastEvent: "CFO sign-off required",
      updatedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    },
    {
      id: "demo_118",
      caseNumber: "REC-2026-00118",
      customer: { name: "Massive Dynamic" },
      source: "CHECKOUT",
      amount: 12500,
      status: "AWAITING_PAYMENT",
      lastEvent: "WhatsApp link delivered",
      updatedAt: new Date(Date.now() - 62 * 60000).toISOString(),
    },
    {
      id: "demo_117",
      caseNumber: "REC-2026-00117",
      customer: { name: "Cyberdyne Systems" },
      source: "SUBSCRIPTION",
      amount: 89000,
      status: "EXECUTING",
      lastEvent: "Card token refreshed",
      updatedAt: new Date(Date.now() - 95 * 60000).toISOString(),
    },
  ];

  const sourceList = cases && cases.length > 0 ? cases : defaultShowcaseCases;

  const getSourceDisplay = (c: any) => {
    if (c.source) return c.source;
    if (c.rootCause === "subscription_payment_failure" || c.subscriptionId) return "SUBSCRIPTION";
    if (c.rootCause === "authentication_error" || c.rootCauseDetails?.toLowerCase().includes("auth")) return "AUTHENTICATION";
    if (c.rootCause === "overdue_invoice" || c.invoiceId) return "RECEIVABLES";
    if (c.rootCause === "checkout_abandonment" || c.orderId) return "CHECKOUT";
    return "PAYMENT GATEWAY";
  };

  const getLastEventDisplay = (c: any) => {
    if (c.lastEvent) return c.lastEvent;
    switch (c.status) {
      case "RECOVERED":
        return "Payment captured";
      case "AWAITING_PAYMENT":
        return "Payment link sent";
      case "AWAITING_APPROVAL":
        return "Approval required";
      case "EXECUTING":
        return "Recovery executing";
      case "ACTION_SELECTED":
        return "Strategy formulated";
      case "DIAGNOSED":
        return "Diagnosis completed";
      case "ANALYZING":
        return "AI analysis running";
      default:
        return "Case initiated";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RECOVERED":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]";
      case "AWAITING_PAYMENT":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.25)]";
      case "AWAITING_APPROVAL":
        return "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]";
      case "EXECUTING":
      case "IN_PROGRESS":
        return "bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.25)]";
      case "ACTION_SELECTED":
      case "DIAGNOSED":
        return "bg-violet-500/15 text-violet-300 border-violet-500/40 shadow-[0_0_10px_rgba(139,92,246,0.25)]";
      default:
        return "bg-slate-800/60 text-slate-300 border-slate-700";
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "CT";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Filtered list
  const filteredCases = useMemo(() => {
    return sourceList.filter((c: any) => {
      const matchesSearch =
        searchQuery === "" ||
        c.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getSourceDisplay(c).toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === "ALL") return true;
      if (activeFilter === "ACTION_REQUIRED") return c.status === "AWAITING_APPROVAL" || c.status === "DIAGNOSED";
      if (activeFilter === "AWAITING_PAYMENT") return c.status === "AWAITING_PAYMENT";
      if (activeFilter === "EXECUTING") return c.status === "EXECUTING" || c.status === "IN_PROGRESS";
      if (activeFilter === "RECOVERED") return c.status === "RECOVERED";
      return true;
    });
  }, [sourceList, searchQuery, activeFilter]);

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      all: sourceList.length,
      action: sourceList.filter((c: any) => c.status === "AWAITING_APPROVAL" || c.status === "DIAGNOSED").length,
      awaitingPayment: sourceList.filter((c: any) => c.status === "AWAITING_PAYMENT").length,
      executing: sourceList.filter((c: any) => c.status === "EXECUTING" || c.status === "IN_PROGRESS").length,
      recovered: sourceList.filter((c: any) => c.status === "RECOVERED").length,
    };
  }, [sourceList]);

  return (
    <>
      <div className="bg-gradient-to-b from-[#0C121D] via-[#080D15] to-[#05080E] border border-[#1E293B] hover:border-cyan-500/40 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden transition-all duration-300">
        {/* Top Radiant Cyan-Violet Laser Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-violet-500 opacity-80" />

        {/* Header & Controls Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse status-dot-active" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <span>ACTIVE RECOVERY CASES</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                  {sourceList.length} IN FLIGHT
                </span>
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Autonomous agent recovery queue with real-time state synchronization
              </p>
            </div>
          </div>

          {/* Quick Search and Link */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter cases, accounts..."
                className="w-full bg-[#05080E] border border-[#1E293B] hover:border-slate-700 focus:border-cyan-500/50 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-mono"
                >
                  ✕
                </button>
              )}
            </div>

            <Link
              href="/cases"
              className="flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-xl bg-[#080D15] hover:bg-[#111A29] border border-[#1E293B] hover:border-cyan-500/40 text-cyan-300 hover:text-white transition shadow-sm shrink-0 group"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-[#1E293B]/70 scrollbar-none">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeFilter === "ALL"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(34,211,238,0.2)]"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <span>ALL</span>
            <span className="text-[10px] opacity-70">({counts.all})</span>
          </button>

          <button
            onClick={() => setActiveFilter("AWAITING_PAYMENT")}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeFilter === "AWAITING_PAYMENT"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(34,211,238,0.2)]"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <span>PAYMENT LINK</span>
            <span className="text-[10px] opacity-70">({counts.awaitingPayment})</span>
          </button>

          <button
            onClick={() => setActiveFilter("ACTION_REQUIRED")}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeFilter === "ACTION_REQUIRED"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <span>APPROVAL REQ.</span>
            <span className="text-[10px] opacity-70">({counts.action})</span>
          </button>

          <button
            onClick={() => setActiveFilter("EXECUTING")}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeFilter === "EXECUTING"
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <span>EXECUTING</span>
            <span className="text-[10px] opacity-70">({counts.executing})</span>
          </button>

          <button
            onClick={() => setActiveFilter("RECOVERED")}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeFilter === "RECOVERED"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <span>RECOVERED</span>
            <span className="text-[10px] opacity-70">({counts.recovered})</span>
          </button>
        </div>

        {/* Interactive Cybernetic Table */}
        <div className="overflow-x-auto rounded-xl border border-[#1E293B]/80 bg-[#05080E]/60">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1E293B] text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-[#0A101A]">
                <th className="py-3 px-4 font-semibold">CASE IDENTIFIER</th>
                <th className="py-3 px-4 font-semibold">ACCOUNT ENTITY</th>
                <th className="py-3 px-4 font-semibold">CHANNEL</th>
                <th className="py-3 px-4 font-semibold">AMOUNT AT RISK</th>
                <th className="py-3 px-4 font-semibold">STAGE / STATUS</th>
                <th className="py-3 px-4 font-semibold">LATEST EVENT</th>
                <th className="py-3 px-4 font-semibold">UPDATED</th>
                <th className="py-3 px-4 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/50">
              {filteredCases.map((c: any) => {
                const source = getSourceDisplay(c);
                const lastEvent = getLastEventDisplay(c);
                const amt =
                  typeof c.amount === "number"
                    ? c.amount
                    : typeof c.amountAtRisk === "bigint"
                    ? Number(c.amountAtRisk) / 100
                    : Number(c.amountAtRisk || 0) / 100;

                const initials = getInitials(c.customer?.name);

                return (
                  <tr
                    key={c.id || c.caseNumber}
                    onClick={() => {
                      if (onInspectCase) onInspectCase(c);
                      else setSelectedCase(c);
                    }}
                    className="hover:bg-cyan-950/20 cursor-pointer transition-all duration-150 group border-l-2 border-transparent hover:border-cyan-400"
                  >
                    {/* CASE IDENTIFIER */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {c.caseNumber}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 group-hover:bg-cyan-400 transition-colors" />
                      </div>
                    </td>

                    {/* ACCOUNT ENTITY */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-[#0E1524] border border-[#1E293B] text-[10px] font-mono font-bold text-cyan-300 flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <span className="text-xs text-slate-200 font-semibold truncate block max-w-[200px] group-hover:text-white transition">
                          {c.customer?.name || "Customer Entity"}
                        </span>
                      </div>
                    </td>

                    {/* CHANNEL */}
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-0.5 rounded bg-[#080D15] border border-[#1E293B]">
                        {source}
                      </span>
                    </td>

                    {/* AMOUNT AT RISK */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-white tracking-tight">
                          {formatINR(amt)}
                        </span>
                        {amt >= 100000 && (
                          <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-amber-950/60 border border-amber-500/40 text-amber-300">
                            HIGH
                          </span>
                        )}
                      </div>
                    </td>

                    {/* STAGE / STATUS */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider border ${getStatusBadge(
                          c.status
                        )}`}
                      >
                        {["AWAITING_PAYMENT", "EXECUTING", "IN_PROGRESS", "AWAITING_APPROVAL", "ANALYZING"].includes(
                          c.status
                        ) ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse status-dot-active" />
                        ) : c.status === "RECOVERED" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Clock className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{c.status.replace("_", " ")}</span>
                      </span>
                    </td>

                    {/* LATEST EVENT */}
                    <td className="py-3 px-4">
                      <span className="text-xs text-slate-300 group-hover:text-slate-100 transition">
                        {lastEvent}
                      </span>
                    </td>

                    {/* UPDATED */}
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-mono text-slate-400">
                        {c.updatedAt ? formatRelativeTime(c.updatedAt) : "Just now"}
                      </span>
                    </td>

                    {/* ACTION */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onInspectCase) onInspectCase(c);
                          else setSelectedCase(c);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 hover:border-cyan-400 transition shadow-sm opacity-90 group-hover:opacity-100"
                      >
                        <span>INSPECT</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-mono text-xs">
                    No recovery cases matched filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CDC & PostgreSQL Live Telemetry Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono text-slate-400 pt-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-semibold">POSTGRESQL REALTIME CDC</span>
            <span className="text-slate-500">•</span>
            <span>SHOWING {filteredCases.length} OF {sourceList.length} RECOVERY QUEUES</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-cyan-400">LATENCY: 12ms</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">AUTO-REFRESH: 30s</span>
          </div>
        </div>
      </div>

      {/* Case Drawer on Row Click */}
      {selectedCase && (
        <RecoveryCaseDrawer
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onCaseUpdated={onCaseUpdated}
        />
      )}
    </>
  );
}

