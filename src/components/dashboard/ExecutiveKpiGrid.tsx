"use client";

import React from "react";
import { formatINR } from "@/lib/utils";
import {
  AlertOctagon,
  ShieldCheck,
  Zap,
  TrendingUp,
  Target,
  Sparkles,
  Layers,
  UserCheck,
} from "lucide-react";

export interface ExecutiveKpiProps {
  metrics: {
    totalRevenueAtRisk: number;
    recoverableRevenue: number;
    totalRevenueRecovered: number;
    autonomousRecoveryRate: number;
    activeCasesCount: number;
    totalCasesCount: number;
    humanApprovalCasesCount?: number;
    criticalCasesCount: number;
    atRiskCustomerCount: number;
  };
}

export function ExecutiveKpiGrid({ metrics }: ExecutiveKpiProps) {
  const recoveryRate = metrics.autonomousRecoveryRate ?? 0;
  const humanApprovals = metrics.humanApprovalCasesCount ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {/* 1. Total Revenue at Risk */}
      <div className="bg-surface-card/90 border border-surface-border hover:border-rose-500/40 rounded-xl p-4 transition-all duration-200 relative group shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-300">
            Revenue At Risk
          </span>
          <div className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
            <AlertOctagon className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
          {formatINR(metrics.totalRevenueAtRisk)}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
          <span className="flex items-center gap-1.5 text-rose-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            {metrics.criticalCasesCount} Critical
          </span>
          <span className="font-mono text-slate-500 text-[10px]">{metrics.atRiskCustomerCount} accounts</span>
        </div>
      </div>

      {/* 2. Recoverable Pipeline (AI Weighted) */}
      <div className="bg-surface-card/90 border border-surface-border hover:border-sky-500/40 rounded-xl p-4 transition-all duration-200 relative group shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-300">
            Recoverable Pipeline
          </span>
          <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
            <Target className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-bold text-sky-400 font-mono tracking-tight">
          {formatINR(metrics.recoverableRevenue)}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
          <span className="flex items-center gap-1 text-sky-400 font-medium">
            <Sparkles className="w-3 h-3" />
            AI Weighted
          </span>
          <span className="font-mono text-slate-500 text-[10px]">
            {metrics.totalRevenueAtRisk > 0
              ? `${Math.round((metrics.recoverableRevenue / metrics.totalRevenueAtRisk) * 100)}% of risk`
              : "100%"}
          </span>
        </div>
      </div>

      {/* 3. Revenue Recovered */}
      <div className="bg-surface-card/90 border border-surface-border hover:border-emerald-500/40 rounded-xl p-4 transition-all duration-200 relative group shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-300">
            Revenue Recovered
          </span>
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono tracking-tight">
          {formatINR(metrics.totalRevenueRecovered)}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <TrendingUp className="w-3 h-3" />
            Captured
          </span>
          <span className="font-mono text-slate-500 text-[10px]">Razorpay Webhook</span>
        </div>
      </div>

      {/* 4. Autonomous Recovery Rate */}
      <div className="bg-surface-card/90 border border-surface-border hover:border-indigo-500/40 rounded-xl p-4 transition-all duration-200 relative group shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-300">
            Recovery Rate
          </span>
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight flex items-baseline gap-1">
          <span>{recoveryRate}</span>
          <span className="text-sm font-normal text-slate-400">%</span>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
          <span className="flex items-center gap-1 text-indigo-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            Autonomous
          </span>
          <span className="font-mono text-slate-500 text-[10px]">LangGraph Agent</span>
        </div>
      </div>

      {/* 5. Active Cases */}
      <div className="bg-surface-card/90 border border-surface-border hover:border-slate-700 rounded-xl p-4 transition-all duration-200 relative group shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-300">
            Active Cases
          </span>
          <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-105 transition-transform">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
          {metrics.activeCasesCount}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
          <span className="text-slate-300 font-medium">In Pipeline</span>
          <span className="font-mono text-slate-500 text-[10px]">{metrics.totalCasesCount} lifetime</span>
        </div>
      </div>

      {/* 6. Human Approval Cases */}
      <div className="bg-surface-card/90 border border-surface-border hover:border-amber-500/40 rounded-xl p-4 transition-all duration-200 relative group shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-300">
            Human Approvals
          </span>
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-bold text-amber-400 font-mono tracking-tight">
          {humanApprovals}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
          <span className="flex items-center gap-1 text-amber-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Policy Gate
          </span>
          <span className="font-mono text-slate-500 text-[10px]">&ge; ₹1,00,000 threshold</span>
        </div>
      </div>
    </div>
  );
}
