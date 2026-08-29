"use client";

import React from "react";
import { formatINR } from "@/lib/utils";
import { PieChart, ShieldAlert, BarChart3, AlertCircle } from "lucide-react";

export function RiskDistribution({
  casesByCause,
  totalAtRisk,
}: {
  casesByCause: Record<string, { count: number; amount: number }>;
  totalAtRisk: number;
}) {
  const causes = Object.entries(casesByCause);

  return (
    <div className="glass-card rounded-xl border border-surface-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              Failure Root Causes
            </h3>
            <p className="text-[11px] text-slate-400">Distribution across Indian payment rails</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {causes.map(([cause, data]) => {
          const percent = totalAtRisk > 0 ? Math.round((data.amount / totalAtRisk) * 100) : 0;
          return (
            <div key={cause} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300 font-mono text-[11px]">
                  {cause.replace(/_/g, " ")}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {formatINR(data.amount)} ({percent}%)
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-razorpay-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(percent, 5)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>Total Active Risk:</span>
        <span className="font-bold text-white font-mono">{formatINR(totalAtRisk)}</span>
      </div>
    </div>
  );
}
