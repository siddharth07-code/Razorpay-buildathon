"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, Zap, Shield, ArrowRight } from "lucide-react";
import { formatINR } from "@/lib/utils";

export interface FunnelStage {
  name: string;
  count: number;
  conversionRate: number;
}

export function RecoveryFunnel({
  stages = [],
  activeCasesCount = 142,
  pipelineAmount = 97100000,
  recoveryRate = 68.3,
  avgTimeToRecover = "2.7 hrs",
}: {
  stages?: FunnelStage[];
  activeCasesCount?: number;
  pipelineAmount?: number;
  recoveryRate?: number;
  avgTimeToRecover?: string;
}) {
  const pipelineNodes = [
    { step: "01", label: "DETECTED", status: "completed" },
    { step: "02", label: "ANALYZED", status: "completed" },
    { step: "03", label: "QUALIFIED", status: "completed" },
    { step: "04", label: "STRATEGY", status: "completed" },
    { step: "05", label: "APPROVED", status: "active" },
    { step: "06", label: "EXECUTED", status: "pending" },
    { step: "07", label: "RECOVERED", status: "pending" },
  ];

  return (
    <div className="bg-gradient-to-b from-[#0C121D] via-[#080D15] to-[#05080E] border border-[#1E293B] hover:border-cyan-500/40 rounded-2xl p-5 space-y-6 shadow-xl flex flex-col justify-between relative overflow-hidden group transition-all duration-300">
      {/* Top Subtle Cyan Glow Line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse status-dot-active" />
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">
            QUANTUM RECOVERY PIPELINE
          </h3>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
            7-STAGE AUTOMATION
          </span>
        </div>
        <Link
          href="/operations"
          className="flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-medium transition group/link"
        >
          <span>Operations Console</span>
          <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* 7-Stage Connected Timeline Nodes with Animated Progression Flow */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="relative py-3 px-2 min-w-[520px] sm:min-w-0">
          {/* Connecting Line Track */}
          <div className="absolute top-[25px] left-6 right-6 h-[2px] bg-[#151E2E] z-0 overflow-hidden">
            {/* Animated Flowing Gradient Beam */}
            <div className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-transparent w-[72%] animate-beam-flow shadow-[0_0_10px_#22D3EE]" />
          </div>

          <div className="flex items-center justify-between relative z-10">
            {pipelineNodes.map((node) => {
              const isCompleted = node.status === "completed";
              const isActive = node.status === "active";

              return (
                <div key={node.step} className="flex flex-col items-center group cursor-default">
                  {/* Node Circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-300 relative ${
                      isCompleted
                        ? "bg-[#080D15] border-2 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] group-hover:scale-110"
                        : isActive
                        ? "bg-[#080D15] border-2 border-cyan-400 text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.9)] scale-110"
                        : "bg-[#080D15] border border-slate-700 text-slate-500 group-hover:border-slate-600"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute -inset-1 rounded-full border border-cyan-400 animate-ping opacity-60 pointer-events-none" />
                    )}
                    {node.step}
                  </div>

                  {/* Step Label */}
                  <span
                    className={`text-[9px] font-bold tracking-wider uppercase mt-2.5 transition-colors ${
                      isActive
                        ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] font-mono font-extrabold"
                        : isCompleted
                        ? "text-slate-300 group-hover:text-white"
                        : "text-slate-500 group-hover:text-slate-400"
                    }`}
                  >
                    {node.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#1E293B]">
        <div className="p-2.5 rounded-xl bg-[#05080E]/60 border border-[#1E293B]">
          <div className="text-lg sm:text-xl font-bold text-white font-mono">
            {activeCasesCount}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
            Active Cases
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[#05080E]/60 border border-[#1E293B]">
          <div className="text-lg sm:text-xl font-bold text-cyan-300 font-mono">
            {formatINR(pipelineAmount)}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
            In Pipeline
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[#05080E]/60 border border-[#1E293B]">
          <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">
            {recoveryRate}%
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
            Recovery Rate
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[#05080E]/60 border border-[#1E293B]">
          <div className="text-lg sm:text-xl font-bold text-violet-400 font-mono">
            {avgTimeToRecover}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
            Avg. Resolution
          </div>
        </div>
      </div>
    </div>
  );
}
