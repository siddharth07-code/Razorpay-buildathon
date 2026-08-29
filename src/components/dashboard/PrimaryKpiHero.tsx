"use client";

import React from "react";
import { formatINR } from "@/lib/utils";
import { Activity, Target, CheckCircle2, Info } from "lucide-react";

export interface PrimaryKpiHeroProps {
  metrics: {
    totalRevenueAtRisk?: number;
    totalExpectedRecovery?: number;
    totalRevenueRecovered?: number;
    autonomousRecoveryRate?: number;
    activeCasesCount?: number;
  };
}

export function PrimaryKpiHero({ metrics }: PrimaryKpiHeroProps) {
  const atRisk = metrics.totalRevenueAtRisk || 0;
  const recoverable = metrics.totalExpectedRecovery || 0;
  const recovered = metrics.totalRevenueRecovered || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
      {/* 1. Revenue At Risk */}
      <div className="bg-[#0F1523] border border-[#1E293B] hover:border-slate-700/80 transition rounded-2xl p-5 flex items-center justify-between shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400 uppercase tracking-wider">
            <span>REVENUE AT RISK</span>
            <Info className="w-3 h-3 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight pt-0.5">
            {formatINR(atRisk)}
          </div>
          <div className="text-xs text-rose-400 font-medium pt-1">
            +8.4% <span className="text-slate-400 font-normal">vs last 7 days</span>
          </div>
        </div>

        <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Recoverable Pipeline */}
      <div className="bg-[#0F1523] border border-[#1E293B] hover:border-slate-700/80 transition rounded-2xl p-5 flex items-center justify-between shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
            <span>RECOVERABLE PIPELINE</span>
            <Info className="w-3 h-3 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight pt-0.5">
            {formatINR(recoverable)}
          </div>
          <div className="text-xs text-amber-400 font-medium pt-1">
            +11.6% <span className="text-slate-400 font-normal">vs last 7 days</span>
          </div>
        </div>

        <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <Target className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Revenue Recovered */}
      <div className="bg-[#0F1523] border border-[#1E293B] hover:border-slate-700/80 transition rounded-2xl p-5 flex items-center justify-between shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
            <span>REVENUE RECOVERED</span>
            <Info className="w-3 h-3 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight pt-0.5">
            {formatINR(recovered)}
          </div>
          <div className="text-xs text-emerald-400 font-medium pt-1">
            +18.7% <span className="text-slate-400 font-normal">vs last 7 days</span>
          </div>
        </div>

        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
