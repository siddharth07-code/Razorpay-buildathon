"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Link2,
  Webhook,
  TrendingUp,
  Activity,
} from "lucide-react";

export interface ActivityEvent {
  id?: string;
  type?: string;
  title?: string;
  description?: string;
  time?: string;
  amount?: string;
}

export function CuratedRecentActivity({
  events = [],
  activeCasesCount = 142,
}: {
  events?: ActivityEvent[];
  activeCasesCount?: number;
}) {
  const displayEvents = [
    {
      id: "1",
      icon: CheckCircle2,
      iconColor: "text-emerald-400 bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
      title: "Payment recovered",
      description: "₹25,000 from Acme Corp",
      time: "2m ago",
    },
    {
      id: "2",
      icon: AlertTriangle,
      iconColor: "text-amber-400 bg-amber-500/15 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]",
      title: "New case detected",
      description: "Auth drop - BetaSoft",
      time: "6m ago",
    },
    {
      id: "3",
      icon: ShieldCheck,
      iconColor: "text-blue-400 bg-blue-500/15 border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.3)]",
      title: "Policy approved",
      description: "₹2,40,000 sign-off",
      time: "18m ago",
    },
    {
      id: "4",
      icon: Link2,
      iconColor: "text-cyan-400 bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_8px_rgba(34,211,238,0.3)]",
      title: "Payment link active",
      description: "Globex Pvt Ltd link",
      time: "24m ago",
    },
    {
      id: "5",
      icon: Webhook,
      iconColor: "text-emerald-400 bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
      title: "Webhook received",
      description: "Payment captured - Initech",
      time: "32m ago",
    },
  ];

  return (
    <div className="space-y-4 h-full flex flex-col justify-between">
      {/* 1. Mini Card: ACTIVE RECOVERY CASES */}
      <div className="bg-gradient-to-b from-[#0C121D] via-[#080D15] to-[#05080E] border border-[#1E293B] hover:border-violet-500/50 rounded-2xl p-4 flex items-center justify-between shadow-xl relative overflow-hidden group transition-all duration-300">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-80" />

        <div className="space-y-0.5 z-10">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span>ACTIVE CASES</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {activeCasesCount}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-violet-400 font-medium pt-0.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-violet-950/50 border border-violet-500/30 text-[9px] font-mono">
              <TrendingUp className="w-2.5 h-2.5 text-violet-400" />
              +12
            </span>
            <span className="text-slate-400 font-normal">in triage</span>
          </div>
        </div>

        {/* Mini Purple Sparkline */}
        <div className="w-24 h-9 relative z-10">
          <svg viewBox="0 0 100 35" className="w-full h-full">
            <path
              d="M 0,25 Q 15,20 30,28 T 60,15 T 85,18 T 100,5"
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="drop-shadow-[0_0_6px_rgba(139,92,246,0.8)]"
            />
          </svg>
        </div>
      </div>

      {/* 2. RECENT ACTIVITY LEDGER */}
      <div className="bg-gradient-to-b from-[#0C121D] via-[#080D15] to-[#05080E] border border-[#1E293B] hover:border-cyan-500/40 rounded-2xl p-4 space-y-3 shadow-xl flex-1 flex flex-col justify-between relative overflow-hidden group transition-all duration-300">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">
              LIVE LEDGER
            </h3>
          </div>
          <span className="text-[9px] font-mono text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.5 rounded">
            STREAMING
          </span>
        </div>

        <div className="space-y-2.5">
          {displayEvents.map((evt) => {
            const Icon = evt.icon;
            return (
              <div
                key={evt.id}
                className="flex items-start gap-2.5 p-1.5 rounded-xl hover:bg-[#0E1524] transition-colors group/item"
              >
                <div
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${evt.iconColor}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 truncate group-hover/item:text-cyan-300 transition">
                      {evt.title}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono shrink-0 ml-1">
                      {evt.time}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {evt.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>POSTGRESQL SYNCED</span>
          <span className="text-emerald-400 flex items-center gap-1 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
}
