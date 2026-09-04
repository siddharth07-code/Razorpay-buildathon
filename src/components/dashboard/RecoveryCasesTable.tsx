"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RecoveryCase, RecoveryCaseStatus, RecoveryRiskLevel } from "@/types";
import { formatINR, formatRelativeTime } from "@/lib/utils";
import { RecoveryCaseDrawer } from "@/components/cases/RecoveryCaseDrawer";
import {
  Search,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  Filter,
} from "lucide-react";

export function RecoveryCasesTable({
  cases,
  onCaseUpdated,
}: {
  cases: RecoveryCase[];
  onCaseUpdated?: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);

  const filteredCases = cases.filter((c) => {
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesRisk = riskFilter === "ALL" || c.riskLevel === riskFilter;
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.caseNumber.toLowerCase().includes(q) ||
      c.customer?.name.toLowerCase().includes(q) ||
      c.customer?.companyName?.toLowerCase().includes(q) ||
      c.rootCause.toLowerCase().includes(q) ||
      (c.payment?.errorCode && c.payment.errorCode.toLowerCase().includes(q));
    return matchesStatus && matchesRisk && matchesSearch;
  });

  const getRiskBadge = (level: RecoveryRiskLevel) => {
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

  const getStatusBadge = (status: RecoveryCaseStatus) => {
    switch (status) {
      case "RECOVERED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "AWAITING_PAYMENT":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "AWAITING_APPROVAL":
        return "bg-violet-500/10 text-violet-400 border-violet-500/30";
      case "ACTION_SELECTED":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "DIAGNOSED":
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
      case "IN_PROGRESS":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "OPEN":
        return "bg-slate-500/10 text-slate-300 border-slate-500/30";
      case "ESCALATED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-3">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by case, merchant, or error code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-md border border-slate-800">
            {["ALL", "AWAITING_PAYMENT", "AWAITING_APPROVAL", "ACTION_SELECTED", "DIAGNOSED", "IN_PROGRESS", "OPEN", "RECOVERED"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition whitespace-nowrap ${
                  statusFilter === status
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {status === "ALL" ? "All Status" : status.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-razorpay-500"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3.5">Case / Merchant</th>
                <th className="py-2.5 px-3.5">Amount at Risk</th>
                <th className="py-2.5 px-3.5">Risk Tier</th>
                <th className="py-2.5 px-3.5">Failure Reason</th>
                <th className="py-2.5 px-3.5">AI Intervention</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Triage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500 text-xs font-mono">
                    No recovery cases found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCases.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedCase(item)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    {/* Case / Customer */}
                    <td className="py-3 px-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white font-mono text-[11px] flex items-center gap-1.5">
                          {item.caseNumber}
                          {item.customer?.tier === "ENTERPRISE" && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              ENT
                            </span>
                          )}
                        </span>
                        <span className="text-slate-400 text-[11px] mt-0.5 truncate max-w-[170px]">
                          {item.customer?.companyName || item.customer?.name}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-white font-mono text-xs">
                          {formatINR(item.amount)}
                        </span>
                        {item.totalRecoveredAmount > 0 && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            Recovered: {formatINR(item.totalRecoveredAmount)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Risk Tier */}
                    <td className="py-3 px-3.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border font-semibold font-mono ${getRiskBadge(
                          item.riskLevel
                        )}`}
                      >
                        {item.riskLevel}
                      </span>
                    </td>

                    {/* Failure Reason */}
                    <td className="py-3 px-3.5 max-w-[180px]">
                      <div className="flex flex-col">
                        <span className="font-mono text-[11px] text-slate-200 truncate">
                          {item.payment?.errorCode || item.rootCause}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          via {item.payment?.method?.toUpperCase() || "NACH"}
                        </span>
                      </div>
                    </td>

                    {/* AI Recommendation */}
                    <td className="py-3 px-3.5 max-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-razorpay-400 flex-shrink-0" />
                        <span className="text-[11px] text-slate-300 truncate">
                          {item.aiRecommendation?.action || "Autonomous dunning"}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded border font-semibold font-mono ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {["AWAITING_PAYMENT", "EXECUTING", "IN_PROGRESS", "AWAITING_APPROVAL", "ANALYZING", "ACTION_SELECTED"].includes(item.status) ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse status-dot-active" />
                        ) : item.status === "RECOVERED" ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        ) : null}
                        <span>{item.status.replace("_", " ")}</span>
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedCase(item)}
                          className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-800 transition"
                        >
                          Drawer
                        </button>
                        <Link
                          href={`/cases/${item.id}`}
                          className="text-xs text-razorpay-400 hover:text-razorpay-300 p-1 hover:bg-slate-800 rounded transition"
                          title="Open standalone page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      <RecoveryCaseDrawer
        caseItem={selectedCase}
        onClose={() => setSelectedCase(null)}
        onCaseUpdated={onCaseUpdated}
      />
    </div>
  );
}
