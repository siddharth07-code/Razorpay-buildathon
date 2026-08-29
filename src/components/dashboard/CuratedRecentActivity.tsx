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
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      title: "Payment recovered",
      description: "₹25,000 from Acme Corp",
      time: "2m ago",
    },
    {
      id: "2",
      icon: AlertTriangle,
      iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      title: "New case detected",
      description: "Authentication failure - BetaSoft",
      time: "6m ago",
    },
    {
      id: "3",
      icon: ShieldCheck,
      iconColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      title: "Policy approved",
      description: "₹2,40,000 recovery approved",
      time: "18m ago",
    },
    {
      id: "4",
      icon: Link2,
      iconColor: "text-violet-400 bg-violet-500/10 border-violet-500/20",
      title: "Payment link generated",
      description: "Order created for Globex Pvt Ltd",
      time: "24m ago",
    },
    {
      id: "5",
      icon: Webhook,
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      title: "Webhook received",
      description: "Payment captured - Initech",
      time: "32m ago",
    },
  ];

  return (
    <div className="space-y-4 h-full flex flex-col justify-between">
      {/* 1. Mini Card: ACTIVE RECOVERY CASES */}
      <div className="bg-[#080D15] border border-[#151E2E] rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            ACTIVE RECOVERY CASES
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {activeCasesCount}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-violet-400 font-medium pt-0.5">
            <TrendingUp className="w-3 h-3 text-violet-400" />
            <span>12</span>
            <span className="text-slate-400 font-normal">vs last 30d</span>
          </div>
        </div>

        {/* Mini Purple Sparkline */}
        <div className="w-24 h-8">
          <svg viewBox="0 0 100 35" className="w-full h-full">
            <path
              d="M 0,25 Q 15,20 30,28 T 60,15 T 85,18 T 100,5"
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="2"
              strokeLinecap="round"
              className="drop-shadow-[0_0_4px_rgba(139,92,246,0.6)]"
            />
          </svg>
        </div>
      </div>

      {/* 2. RECENT ACTIVITY Ledger Card */}
      <div className="bg-[#080D15] border border-[#151E2E] rounded-2xl p-4 flex-1 flex flex-col justify-between shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            RECENT ACTIVITY
          </h3>
          <Link
            href="/audit"
            className="text-[10px] text-slate-400 hover:text-cyan-400 font-medium transition"
          >
            View All
          </Link>
        </div>

        <div className="space-y-2.5">
          {displayEvents.map((evt) => {
            const Icon = evt.icon;
            return (
              <div key={evt.id} className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${evt.iconColor}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-200 truncate">
                      {evt.title}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {evt.description}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                  {evt.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
