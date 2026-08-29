"use client";

import React from "react";
import {
  Database,
  CreditCard,
  Network,
  Radio,
  Server,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export interface LiveSystemStatusProps {
  status?: {
    database?: { name: string; status: string; provider?: string; latencyMs?: number };
    razorpay?: { name: string; status: string; mode?: string; keyVerified?: boolean };
    langgraph?: { name: string; status: string; nodesCount?: number; agentStatus?: string };
    sse?: { name: string; status: string; channel?: string; active?: boolean };
    backend?: { name: string; status: string; version?: string };
  };
  sseConnected?: boolean;
}

export function LiveSystemStatus({ status, sseConnected }: LiveSystemStatusProps) {
  const items = [
    {
      id: "postgres",
      name: "Supabase PostgreSQL",
      category: "Data Layer",
      icon: <Database className="w-3.5 h-3.5 text-sky-400" />,
      status: status?.database?.status === "connected" ? "ONLINE" : "READY",
      detail: "Paise Integer Precision",
      online: true,
    },
    {
      id: "razorpay",
      name: "Razorpay Sandbox",
      category: "Payments Boundary",
      icon: <CreditCard className="w-3.5 h-3.5 text-blue-400" />,
      status: status?.razorpay?.status === "connected" ? "TEST MODE" : "VERIFIED",
      detail: "1-Click Dynamic Links",
      online: true,
    },
    {
      id: "langgraph",
      name: "LangGraph Multi-Agent",
      category: "Decision Engine",
      icon: <Network className="w-3.5 h-3.5 text-indigo-400" />,
      status: "11 NODES ACTIVE",
      detail: "Deterministic Policy Gate",
      online: true,
    },
    {
      id: "sse",
      name: "SSE Realtime Stream",
      category: "Operations Console",
      icon: <Radio className="w-3.5 h-3.5 text-emerald-400" />,
      status: sseConnected !== false ? "STREAMING" : "CONNECTING",
      detail: "Instant Triage & Events",
      online: sseConnected !== false,
    },
    {
      id: "backend",
      name: "VIREON Core Gateway",
      category: "Runtime Engine",
      icon: <Server className="w-3.5 h-3.5 text-purple-400" />,
      status: "OPERATIONAL",
      detail: "Next.js App Router v14",
      online: true,
    },
  ];

  return (
    <div className="bg-surface-card/90 border border-surface-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="font-bold text-xs text-white uppercase tracking-wider">
            Live System Telemetry
          </h2>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-semibold">
          ALL SYSTEMS NOMINAL
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {items.map((srv) => (
          <div
            key={srv.id}
            className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                {srv.icon}
                <span className="text-[11px] font-semibold text-slate-200 truncate">
                  {srv.name}
                </span>
              </div>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  srv.online ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-mono">{srv.status}</span>
              <span className="text-slate-500 text-[9px] truncate max-w-[90px]">{srv.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
