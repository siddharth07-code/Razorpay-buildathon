"use client";

import React from "react";
import { formatINR } from "@/lib/utils";
import { Info, TrendingUp, TrendingDown } from "lucide-react";

export interface VireonKpiMetrics {
  totalRevenueAtRisk: number;
  totalExpectedRecovery: number;
  totalRevenueRecovered: number;
  autonomousRecoveryRate: number;
  activeCasesCount?: number;
}

export function VireonKpiCards({ metrics }: { metrics: VireonKpiMetrics }) {
  const atRisk = metrics.totalRevenueAtRisk || 0;
  const recoverable = metrics.totalExpectedRecovery || 0;
  const recovered = metrics.totalRevenueRecovered || 0;
  const rate = metrics.autonomousRecoveryRate || 68.3;

  const recoverablePct = atRisk > 0 ? Math.round((recoverable / atRisk) * 1000) / 10 : 77.8;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {/* 1. REVENUE AT RISK */}
      <div className="bg-[#080D15] border border-[#151E2E] hover:border-amber-500/30 transition-all rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>REVENUE AT RISK</span>
            <Info className="w-3 h-3 text-slate-400 hover:text-slate-200 cursor-pointer" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight pt-0.5">
            {formatINR(atRisk)}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-400 pt-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>8.4%</span>
            <span className="text-slate-400 font-normal ml-0.5">vs last 30 days</span>
          </div>
        </div>

        {/* Glowing Amber Sparkline SVG */}
        <div className="w-full h-12 mt-3 pt-1 relative">
          <svg viewBox="0 0 200 45" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="amber-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
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
              strokeWidth="2"
              strokeLinecap="round"
              className="drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]"
            />
          </svg>
        </div>
      </div>

      {/* 2. RECOVERABLE PIPELINE */}
      <div className="bg-[#080D15] border border-[#151E2E] hover:border-cyan-500/30 transition-all rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>RECOVERABLE PIPELINE</span>
            <Info className="w-3 h-3 text-slate-400 hover:text-slate-200 cursor-pointer" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight pt-0.5">
            {formatINR(recoverable)}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 pt-1">
            <span>{recoverablePct}%</span>
            <span className="text-slate-400 font-normal ml-0.5">of at-risk</span>
          </div>
        </div>

        {/* Glowing Cyan Sparkline SVG */}
        <div className="w-full h-12 mt-3 pt-1 relative">
          <svg viewBox="0 0 200 45" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="cyan-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.25" />
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
              strokeWidth="2"
              strokeLinecap="round"
              className="drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]"
            />
          </svg>
        </div>
      </div>

      {/* 3. REVENUE RECOVERED */}
      <div className="bg-[#080D15] border border-[#151E2E] hover:border-emerald-500/30 transition-all rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>REVENUE RECOVERED</span>
            <Info className="w-3 h-3 text-slate-400 hover:text-slate-200 cursor-pointer" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight pt-0.5">
            {formatINR(recovered)}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 pt-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>18.7%</span>
            <span className="text-slate-400 font-normal ml-0.5">vs last 30 days</span>
          </div>
        </div>

        {/* Glowing Emerald Sparkline SVG */}
        <div className="w-full h-12 mt-3 pt-1 relative">
          <svg viewBox="0 0 200 45" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="emerald-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
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
              strokeWidth="2"
              strokeLinecap="round"
              className="drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]"
            />
          </svg>
        </div>
      </div>

      {/* 4. RECOVERY RATE */}
      <div className="bg-[#080D15] border border-[#151E2E] hover:border-violet-500/30 transition-all rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>RECOVERY RATE</span>
            <Info className="w-3 h-3 text-slate-400 hover:text-slate-200 cursor-pointer" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight pt-0.5">
            {rate}%
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-violet-400 pt-1">
            <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
            <span>6.1%</span>
            <span className="text-slate-400 font-normal ml-0.5">vs last 30 days</span>
          </div>
        </div>

        {/* Glowing Violet Sparkline SVG */}
        <div className="w-full h-12 mt-3 pt-1 relative">
          <svg viewBox="0 0 200 45" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="violet-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
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
              strokeWidth="2"
              strokeLinecap="round"
              className="drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
