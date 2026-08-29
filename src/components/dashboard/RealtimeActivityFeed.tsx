"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Bot,
  Zap,
  ShieldCheck,
  CreditCard,
  Building2,
  ExternalLink,
  Terminal,
} from "lucide-react";

export interface ActivityEvent {
  id: string;
  caseId?: string;
  caseNumber?: string;
  type: string;
  actor: string;
  timestamp: string;
  status: "success" | "running" | "waiting" | "blocked" | "failed";
  description: string;
  isSimulated?: boolean;
}

export interface RealtimeActivityFeedProps {
  initialActivity?: ActivityEvent[];
}

export function RealtimeActivityFeed({ initialActivity = [] }: RealtimeActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>(initialActivity);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (initialActivity.length > 0 && events.length === 0) {
      setEvents(initialActivity);
    }
  }, [initialActivity]);

  useEffect(() => {
    const eventSource = new EventSource("/api/events/stream");

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "HEARTBEAT" || data.type === "CONNECTED") return;

        const newEvent: ActivityEvent = {
          id: data.id || `evt_${Date.now()}`,
          caseId: data.caseId,
          caseNumber: data.caseNumber || "REC-LIVE",
          type: data.type || "WORKFLOW_EVENT",
          actor: data.actor || "AGENT",
          timestamp: data.timestamp || new Date().toISOString(),
          status: data.status || "running",
          description: data.description || "Recovery workflow state updated",
          isSimulated: data.actor?.includes("SIMULATOR") || data.description?.includes("Simulator") || false,
        };

        setEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const getActorIcon = (actor: string) => {
    if (actor.includes("RISK") || actor.includes("AGENT")) {
      return <Bot className="w-3.5 h-3.5 text-indigo-400" />;
    }
    if (actor.includes("POLICY")) {
      return <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />;
    }
    if (actor.includes("RAZORPAY") || actor.includes("WEBHOOK")) {
      return <CreditCard className="w-3.5 h-3.5 text-sky-400" />;
    }
    if (actor.includes("EXECUTION")) {
      return <Zap className="w-3.5 h-3.5 text-emerald-400" />;
    }
    return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "blocked":
      case "failed":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "waiting":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    }
  };

  return (
    <div className="bg-surface-card/90 border border-surface-border rounded-xl p-4 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-razorpay-400" />
          <h2 className="font-bold text-xs text-white uppercase tracking-wider">
            Live Recovery Activity Feed
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-mono font-semibold border ${
              connected
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            {connected ? "SSE LIVE" : "POLLING"}
          </span>
          <Link
            href="/audit"
            className="text-[11px] text-slate-400 hover:text-white transition"
          >
            Audit Log &rarr;
          </Link>
        </div>
      </div>

      <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
        {events.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <Terminal className="w-6 h-6 mx-auto mb-2 opacity-40 text-slate-400" />
            <p>Awaiting live recovery telemetry...</p>
          </div>
        ) : (
          events.map((evt) => (
            <div
              key={evt.id}
              className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-slate-900 border border-slate-800 flex items-center justify-center">
                    {getActorIcon(evt.actor)}
                  </div>
                  <span className="font-bold text-white font-mono text-[10px]">
                    {evt.caseNumber || "REC-SYSTEM"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    [{evt.actor}]
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {evt.isSimulated ? (
                    <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.2 rounded font-mono">
                      SIMULATED
                    </span>
                  ) : (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                      REAL
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono">
                    {formatRelativeTime(evt.timestamp)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2">
                {evt.description}
              </p>

              <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px]">
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase border ${getStatusBadge(
                    evt.status
                  )}`}
                >
                  {evt.status}
                </span>

                {evt.caseId && (
                  <Link
                    href={`/cases/${evt.caseId}`}
                    className="text-razorpay-400 hover:text-razorpay-300 flex items-center gap-1 transition"
                  >
                    <span>View Case</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
