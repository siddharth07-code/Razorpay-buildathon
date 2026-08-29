"use client";

import React, { useState } from "react";
import { LeakageCategory } from "@/lib/db/repository";
import { formatINR } from "@/lib/utils";
import { PieChart, CreditCard, AlertCircle, Building2 } from "lucide-react";

export function RevenueLeakageChart({
  byMethod,
  byReason,
  byTier,
  totalFailedAmount,
}: {
  byMethod: LeakageCategory[];
  byReason: LeakageCategory[];
  byTier: LeakageCategory[];
  totalFailedAmount: number;
}) {
  const [activeTab, setActiveTab] = useState<"method" | "reason" | "tier">("reason");

  const currentData =
    activeTab === "method" ? byMethod : activeTab === "reason" ? byReason : byTier;

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-5 space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <PieChart className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Revenue Leakage Breakdown
            </h3>
            <p className="text-[11px] text-slate-400">
              Distribution of at-risk capital across payment infrastructure
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 self-start sm:self-auto text-[11px]">
          <button
            onClick={() => setActiveTab("reason")}
            className={`px-2.5 py-1 rounded font-medium transition ${
              activeTab === "reason"
                ? "bg-razorpay-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            By Root Cause
          </button>
          <button
            onClick={() => setActiveTab("method")}
            className={`px-2.5 py-1 rounded font-medium transition ${
              activeTab === "method"
                ? "bg-razorpay-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            By Payment Rail
          </button>
          <button
            onClick={() => setActiveTab("tier")}
            className={`px-2.5 py-1 rounded font-medium transition ${
              activeTab === "tier"
                ? "bg-razorpay-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            By Customer Tier
          </button>
        </div>
      </div>

      {/* Breakdown Items */}
      <div className="space-y-3 pt-1">
        {currentData.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No failure data recorded.</p>
        ) : (
          currentData.map((item) => (
            <div key={item.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200 text-[11px] font-mono">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({item.count} {item.count === 1 ? "case" : "cases"})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white font-mono text-xs">
                    {formatINR(item.amount)}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 w-8 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-razorpay-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(item.percentage, 4)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>Total Failure Capital Tracked:</span>
        <span className="font-bold text-white">{formatINR(totalFailedAmount)}</span>
      </div>
    </div>
  );
}
