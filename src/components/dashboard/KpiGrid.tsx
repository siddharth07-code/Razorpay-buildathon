"use client";

import React from "react";
import { formatINR } from "@/lib/utils";
import { DashboardMetrics } from "@/lib/db/repository";
import {
  AlertOctagon,
  ShieldCheck,
  Zap,
  TrendingUp,
  Target,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

export function KpiGrid({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Revenue at Risk */}
      <div className="bg-surface-card border border-surface-border rounded-lg p-4 hover:border-slate-700 transition relative group">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
            Revenue at Risk
          </span>
          <div className="w-6 h-6 rounded bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertOctagon className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="text-2xl font-bold text-white font-mono tracking-tight">
          {formatINR(metrics.totalRevenueAtRisk)}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
          <span className="flex items-center gap-1 text-rose-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            {metrics.criticalCasesCount} Critical Cases
          </span>
          <span className="font-mono text-slate-500">{metrics.activeCasesCount} active</span>
        </div>
      </div>

      {/* 2. Recoverable Revenue (AI Weighted) */}
      <div className="bg-surface-card border border-surface-border rounded-lg p-4 hover:border-slate-700 transition relative group">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
            Recoverable Pipeline
          </span>
          <div className="w-6 h-6 rounded bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Target className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="text-2xl font-bold text-sky-400 font-mono tracking-tight">
          {formatINR(metrics.recoverableRevenue)}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
          <span className="flex items-center gap-1 text-sky-400 font-medium">
            <Sparkles className="w-3 h-3 text-sky-400" />
            AI Expected Value
          </span>
          <span className="font-mono text-slate-500">
            {metrics.totalRevenueAtRisk > 0
              ? `${Math.round((metrics.recoverableRevenue / metrics.totalRevenueAtRisk) * 100)}% recoverable`
              : "100%"}
          </span>
        </div>
      </div>

      {/* 3. Revenue Recovered */}
      <div className="bg-surface-card border border-surface-border rounded-lg p-4 hover:border-slate-700 transition relative group">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
            Revenue Recovered
          </span>
          <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">
          {formatINR(metrics.totalRevenueRecovered)}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            Captured via Razorpay
          </span>
          <span className="font-mono text-slate-500">Autonomous</span>
        </div>
      </div>

      {/* 4. Autonomous Recovery Rate */}
      <div className="bg-surface-card border border-surface-border rounded-lg p-4 hover:border-slate-700 transition relative group">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
            Recovery Rate
          </span>
          <div className="w-6 h-6 rounded bg-razorpay-500/10 border border-razorpay-500/20 flex items-center justify-center text-razorpay-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="text-2xl font-bold text-white font-mono tracking-tight">
          {metrics.autonomousRecoveryRate}%
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
          <span className="text-razorpay-400 font-medium font-mono">
            {metrics.avgRecoveryTimeHours}h avg velocity
          </span>
          <span className="text-slate-500 font-mono">vs 18% standard</span>
        </div>
      </div>
    </div>
  );
}
