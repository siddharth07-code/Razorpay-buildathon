"use client";

import React from "react";
import { formatINR } from "@/lib/utils";
import { Info, TrendingUp, TrendingDown, Activity, CheckCircle, Shield, Zap } from "lucide-react";

export interface VireonKpiMetrics {
  totalRevenueAtRisk: number;
  totalExpectedRecovery: number;
  totalRevenueRecovered: number;
  autonomousRecoveryRate: number;
  activeCasesCount?: number;
  dateRangeLabel?: string;
}

export function VireonKpiCards({ metrics }: { metrics: VireonKpiMetrics }) {
  const atRisk = metrics.totalRevenueAtRisk || 0;
  const recoverable = metrics.totalExpectedRecovery || 0;
  const recovered = metrics.totalRevenueRecovered || 0;
  const rate = metrics.autonomousRecoveryRate || 68.3;

  const recoverablePct = atRisk > 0 ? Math.round((recoverable / atRisk) * 1000) / 10 : 77.8;

  const rangeSubtitle =
    metrics.dateRangeLabel === "Today"
      ? "vs yesterday"
      : metrics.dateRangeLabel === "Last 7 Days"
      ? "vs prior 7d"
      : metrics.dateRangeLabel === "Last 90 Days"
      ? "vs prior qtr"
      : metrics.dateRangeLabel?.startsWith("Year to Date") || metrics.dateRangeLabel === "YTD"
      ? "vs FY2025"
      : metrics.dateRangeLabel === "All Time"
      ? "cumulative"
      : "vs last 30d";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {/* 1. REVENUE AT RISK */}
      <div className="bg-gradient-to-b from-[#0C121D] via-[#080D15] to-[#05080E] border border-[#1E293B] hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(245,158,11,0.14)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
        {/* Top Radiant Laser Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
        {/* Subtle Corner HUD Accent */}
        <div className="absolute top-2 right-2 text-[8px] font-mono text-amber-400/60 uppercase tracking-widest flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>MONITORING</span>
        </div>

        {/* Ambient Hover Spotlight */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />

        <div className="space-y-1.5 z-10 pt-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>REVENUE AT RISK</span>
            <Info className="w-3 h-3 text-slate-400 group-hover:text-amber-400 transition-colors cursor-pointer" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight text-shadow-sm">
            {formatINR(atRisk)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400 pt-0.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-500/30 text-[10px] font-mono">
              <TrendingUp className="w-3 h-3 text-amber-400" />
              +8.4%
            </span>
            <span className="text-slate-400 text-[10px]">{rangeSubtitle}</span>
          </div>
        </div>

        {/* Glowing Amber Sparkline SVG */}
        <div className="w-full h-12 mt-3 pt-1 relative z-10">
          <svg viewBox="0 0 200 45" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="amber-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0,35 Q 25,38 50,30 T 100,28 T 150,18 T 180,12 T 200,8 L 200,45 L 0,45 Z"
              fill="url(#amber-glow)"
            />
            <path
              d="M 0,35 Q 25,38 50,30 T 100,28 T 150,18 T 180,12 T 200,8"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"
            />
          </svg>
        </div>
      </div>

      {/* 2. RECOVERABLE PIPELINE */}
      <div className="bg-gradient-to-b from-[#0C121D] via-[#080D15] to-[#05080E] border border-[#1E293B] hover:border-cyan-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(34,211,238,0.14)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
        {/* Top Radiant Laser Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
        {/* Subtle Corner HUD Accent */}
        <div className="absolute top-2 right-2 text-[8px] font-mono text-cyan-400/60 uppercase tracking-widest flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse status-dot-active" />
          <span>CONFIDENCE 88%</span>
        </div>

        {/* Ambient Hover Spotlight */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />

        <div className="space-y-1.5 z-10 pt-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>RECOVERABLE PIPELINE</span>
            <Info className="w-3 h-3 text-slate-400 group-hover:text-cyan-400 transition-colors cursor-pointer" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {formatINR(recoverable)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-cyan-400 pt-0.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 text-[10px] font-mono font-bold">
              {recoverablePct}%
            </span>
            <span className="text-slate-400 text-[10px]">of total at-risk</span>
          </div>
        </div>

        {/* Glowing Cyan Sparkline SVG */}
        <div className="w-full h-12 mt-3 pt-1 relative z-10">
          <svg viewBox="0 0 200 45" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="cyan-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0,38 Q 30,35 60,25 T 110,22 T 160,14 T 200,6 L 200,45 L 0,45 Z"
              fill="url(#cyan-glow)"
            />
            <path
              d="M 0,38 Q 30,35 60,25 T 110,22 T 160,14 T 200,6"
              fill="none"
              stroke="#22D3EE"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
            />
          </svg>
        </div>
      </div>

      {/* 3. REVENUE RECOVERED */}
      <div className="bg-gradient-to-b from-[#0C121D] via-[#080D15] to-[#05080E] border border-[#1E293B] hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(16,185,129,0.14)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
        {/* Top Radiant Laser Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
        {/* Subtle Corner HUD Accent */}
        <div className="absolute top-2 right-2 text-[8px] font-mono text-emerald-400/70 uppercase tracking-widest flex items-center gap-1">
          <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
          <span>SETTLED</span>
        </div>

        {/* Ambient Hover Spotlight */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />

        <div className="space-y-1.5 z-10 pt-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>REVENUE RECOVERED</span>
            <Info className="w-3 h-3 text-slate-400 group-hover:text-emerald-400 transition-colors cursor-pointer" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {formatINR(recovered)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 pt-0.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30 text-[10px] font-mono font-bold">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              +18.7%
            </span>
            <span className="text-slate-400 text-[10px]">{rangeSubtitle}</span>
          </div>
        </div>

        {/* Glowing Emerald Sparkline SVG */}
        <div className="w-full h-12 mt-3 pt-1 relative z-10">
          <svg viewBox="0 0 200 45" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="emerald-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0,40 Q 20,38 50,32 T 90,26 T 140,16 T 175,10 T 200,4 L 200,45 L 0,45 Z"
              fill="url(#emerald-glow)"
            />
            <path
              d="M 0,40 Q 20,38 50,32 T 90,26 T 140,16 T 175,10 T 200,4"
              fill="none"
              stroke="#10B981"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
            />
          </svg>
        </div>
      </div>

      {/* 4. RECOVERY RATE */}
      <div className="bg-gradient-to-b from-[#0C121D] via-[#080D15] to-[#05080E] border border-[#1E293B] hover:border-violet-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(139,92,246,0.14)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
        {/* Top Radiant Laser Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
        {/* Subtle Corner HUD Accent */}
        <div className="absolute top-2 right-2 text-[8px] font-mono text-violet-400/70 uppercase tracking-widest flex items-center gap-1">
          <Zap className="w-2.5 h-2.5 text-violet-400" />
          <span>AUTONOMOUS</span>
        </div>

        {/* Ambient Hover Spotlight */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-500/20 transition-all" />

        <div className="space-y-1.5 z-10 pt-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>RECOVERY RATE</span>
            <Info className="w-3 h-3 text-slate-400 group-hover:text-violet-400 transition-colors cursor-pointer" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {rate}%
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-violet-400 pt-0.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-950/50 border border-violet-500/30 text-[10px] font-mono font-bold">
              <TrendingUp className="w-3 h-3 text-violet-400" />
              +6.1%
            </span>
            <span className="text-slate-400 text-[10px]">{rangeSubtitle}</span>
          </div>
        </div>

        {/* Glowing Violet Sparkline SVG */}
        <div className="w-full h-12 mt-3 pt-1 relative z-10">
          <svg viewBox="0 0 200 45" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="violet-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0,36 Q 30,34 70,24 T 120,20 T 170,12 T 200,5 L 200,45 L 0,45 Z"
              fill="url(#violet-glow)"
            />
            <path
              d="M 0,36 Q 30,34 70,24 T 120,20 T 170,12 T 200,5"
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
