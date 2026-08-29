"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
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
    <div className="bg-[#080D15] border border-[#151E2E] rounded-2xl p-5 space-y-6 shadow-sm flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
          RECOVERY PIPELINE
        </h3>
        <Link
          href="/operations/graph"
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-400 font-medium transition"
        >
          <span>View LangGraph Flow</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* 7-Stage Connected Timeline Nodes matching Reference Image */}
      <div className="relative py-2 px-2">
        {/* Connecting Line */}
        <div className="absolute top-[21px] left-6 right-6 h-[2px] bg-[#151E2E] z-0">
          <div className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-transparent w-[68%]" />
        </div>

        <div className="flex items-center justify-between relative z-10">
          {pipelineNodes.map((node) => {
            const isCompleted = node.status === "completed";
            const isActive = node.status === "active";

            return (
              <div key={node.step} className="flex flex-col items-center group cursor-default">
                {/* Node Circle */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all ${
                    isCompleted
                      ? "bg-[#080D15] border-2 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      : isActive
                      ? "bg-[#080D15] border-2 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.7)] scale-110"
                      : "bg-[#080D15] border border-slate-700 text-slate-400"
                  }`}
                >
                  {node.step}
                </div>

                {/* Step Label */}
                <span
                  className={`text-[9px] font-bold tracking-wider uppercase mt-2 transition-colors ${
                    isActive
                      ? "text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                      : isCompleted
                      ? "text-slate-300"
                      : "text-slate-400"
                  }`}
                >
                  {node.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#151E2E]/80">
        <div>
          <div className="text-lg sm:text-xl font-bold text-white font-mono">
            {activeCasesCount}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
            Active Cases
          </div>
        </div>

        <div>
          <div className="text-lg sm:text-xl font-bold text-white font-mono">
            {formatINR(pipelineAmount)}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
            In Pipeline
          </div>
        </div>

        <div>
          <div className="text-lg sm:text-xl font-bold text-white font-mono">
            {recoveryRate}%
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
            Recovery Rate
          </div>
        </div>

        <div>
          <div className="text-lg sm:text-xl font-bold text-white font-mono">
            {avgTimeToRecover}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
            Avg. Time to Recover
          </div>
        </div>
      </div>
    </div>
  );
}
