"use client";

import React from "react";
import { AgentDecision } from "@/types";
import { formatRelativeTime } from "@/lib/utils";
import { Bot, Sparkles, Zap, ShieldCheck, ArrowRight } from "lucide-react";

export function AgentFeed({ decisions }: { decisions: AgentDecision[] }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-razorpay-500/10 border border-razorpay-500/20 flex items-center justify-center text-razorpay-400">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Agent Decision Operations Stream
            </h3>
            <p className="text-[11px] text-slate-400">Autonomous heuristics & intervention logs</p>
          </div>
        </div>

        <span className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ACTIVE
        </span>
      </div>

      <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
        {decisions.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8 font-mono">
            No agent decisions in queue.
          </p>
        ) : (
          decisions.map((dec) => (
            <div
              key={dec.id}
              className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2 hover:border-slate-700 transition text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white font-mono text-[11px]">{dec.caseNumber}</span>
                  <span className="text-slate-400 text-[11px] truncate max-w-[130px]">
                    {dec.customerName}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {formatRelativeTime(dec.timestamp)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-razorpay-400 bg-razorpay-500/10 px-2 py-0.5 rounded border border-razorpay-500/20 truncate font-mono">
                  {dec.decisionType.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                  {Math.round(dec.confidence * 100)}% Conf
                </span>
              </div>

              <p className="text-slate-300 text-[11px] leading-relaxed italic bg-slate-950/70 p-2 rounded border border-slate-800/80">
                "{dec.rationale}"
              </p>

              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-800/60">
                <div className="flex items-center gap-1 text-slate-300">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span className="truncate max-w-[180px]">{dec.channel}</span>
                </div>
                <span className="text-emerald-400 font-medium">
                  {dec.executionStatus}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
