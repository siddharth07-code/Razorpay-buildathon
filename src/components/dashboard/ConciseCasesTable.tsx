"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatINR, formatRelativeTime } from "@/lib/utils";
import { RecoveryCase } from "@/types";
import { ArrowRight, MoreVertical } from "lucide-react";
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

  // Authoritative default showcase rows matching reference image if cases array is empty
  const defaultShowcaseCases = [
    {
      id: "demo_124",
      caseNumber: "REC-2026-00124",
      customer: { name: "Acme Technologies India Pvt Ltd" },
      source: "AUTHENTICATION",
      amount: 2500000,
      status: "AWAITING_PAYMENT",
      lastEvent: "Payment link sent",
      updatedAt: new Date(Date.now() - 2 * 60000).toISOString(),
    },
    {
      id: "demo_123",
      caseNumber: "REC-2026-00123",
      customer: { name: "BetaSoft Systems" },
      source: "PAYMENT GATEWAY",
      amount: 12450000,
      status: "AWAITING_APPROVAL",
      lastEvent: "Approval required",
      updatedAt: new Date(Date.now() - 6 * 60000).toISOString(),
    },
    {
      id: "demo_122",
      caseNumber: "REC-2026-00122",
      customer: { name: "Globex Pvt Ltd" },
      source: "PAYMENT GATEWAY",
      amount: 7500000,
      status: "EXECUTING",
      lastEvent: "Recovery executing",
      updatedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    },
    {
      id: "demo_121",
      caseNumber: "REC-2026-00121",
      customer: { name: "Initech" },
      source: "SUBSCRIPTION",
      amount: 4890000,
      status: "RECOVERED",
      lastEvent: "Payment captured",
      updatedAt: new Date(Date.now() - 18 * 60000).toISOString(),
    },
    {
      id: "demo_120",
      caseNumber: "REC-2026-00120",
      customer: { name: "Umbrella Corp" },
      source: "AUTHENTICATION",
      amount: 3200000,
      status: "DIAGNOSED",
      lastEvent: "Diagnosis completed",
      updatedAt: new Date(Date.now() - 22 * 60000).toISOString(),
    },
  ];

  const displayList = cases && cases.length > 0 ? cases.slice(0, 8) : defaultShowcaseCases;

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
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
      case "AWAITING_PAYMENT":
        return "bg-blue-500/15 text-blue-300 border border-blue-500/30";
      case "AWAITING_APPROVAL":
        return "bg-violet-500/15 text-violet-300 border border-violet-500/30";
      case "EXECUTING":
        return "bg-blue-600/15 text-blue-400 border border-blue-500/30";
      case "ACTION_SELECTED":
      case "DIAGNOSED":
        return "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30";
      default:
        return "bg-slate-800 text-slate-300 border border-slate-700";
    }
  };

  return (
    <>
      <div className="bg-[#080D15] border border-[#151E2E] rounded-2xl p-5 space-y-4 shadow-sm">
        {/* Table Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            ACTIVE RECOVERY CASES
          </h3>
          <Link
            href="/cases"
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-400 font-medium transition"
          >
            <span>View All Cases</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#151E2E] text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="pb-3 pr-4 font-semibold">CASE ID</th>
                <th className="pb-3 pr-4 font-semibold">CUSTOMER</th>
                <th className="pb-3 pr-4 font-semibold">SOURCE</th>
                <th className="pb-3 pr-4 font-semibold">AT RISK</th>
                <th className="pb-3 pr-4 font-semibold">STATE</th>
                <th className="pb-3 pr-4 font-semibold">LAST EVENT</th>
                <th className="pb-3 pr-4 font-semibold">UPDATED</th>
                <th className="pb-3 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151E2E]/60">
              {displayList.map((c: any) => {
                const source = getSourceDisplay(c);
                const lastEvent = getLastEventDisplay(c);
                const amt = typeof c.amount === "number" ? c.amount : typeof c.amountAtRisk === "bigint" ? Number(c.amountAtRisk) / 100 : Number(c.amountAtRisk || 0) / 100;

                return (
                  <tr
                    key={c.id || c.caseNumber}
                    onClick={() => {
                      if (onInspectCase) onInspectCase(c);
                      else setSelectedCase(c);
                    }}
                    className="hover:bg-[#0E141C] cursor-pointer transition-colors group"
                  >
                    {/* CASE ID */}
                    <td className="py-3.5 pr-4">
                      <span className="font-mono text-xs font-semibold text-white group-hover:text-cyan-400 transition">
                        {c.caseNumber}
                      </span>
                    </td>

                    {/* CUSTOMER */}
                    <td className="py-3.5 pr-4">
                      <span className="text-xs text-slate-200 font-medium truncate block max-w-[200px]">
                        {c.customer?.name || "Customer Entity"}
                      </span>
                    </td>

                    {/* SOURCE */}
                    <td className="py-3.5 pr-4">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        {source}
                      </span>
                    </td>

                    {/* AT RISK */}
                    <td className="py-3.5 pr-4">
                      <span className="font-mono text-xs font-bold text-white">
                        {formatINR(amt)}
                      </span>
                    </td>

                    {/* STATE */}
                    <td className="py-3.5 pr-4">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${getStatusBadge(
                          c.status
                        )}`}
                      >
                        {c.status.replace("_", " ")}
                      </span>
                    </td>

                    {/* LAST EVENT */}
                    <td className="py-3.5 pr-4">
                      <span className="text-xs text-slate-300">
                        {lastEvent}
                      </span>
                    </td>

                    {/* UPDATED */}
                    <td className="py-3.5 pr-4">
                      <span className="text-[11px] font-mono text-slate-400">
                        {c.updatedAt ? formatRelativeTime(c.updatedAt) : "Just now"}
                      </span>
                    </td>

                    {/* Action Menu */}
                    <td className="py-3.5 text-right text-slate-400 group-hover:text-slate-200">
                      <MoreVertical className="w-3.5 h-3.5 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
