"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShieldAlert,
  Bot,
  SlidersHorizontal,
  History,
  Network,
  Activity,
  TrendingDown,
  TrendingUp,
  Database,
  CheckCircle2,
  Zap,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const coreNav = [
    {
      name: "Overview",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Recovery Cases",
      href: "/cases",
      icon: ShieldAlert,
    },
    {
      name: "Operations",
      href: "/operations",
      icon: Bot,
      badge: "LIVE",
    },
    {
      name: "Revenue Intelligence",
      href: "/analytics",
      icon: TrendingUp,
    },
  ];

  const intelligenceNav = [
    {
      name: "Audit Trail",
      href: "/audit",
      icon: History,
    },
    {
      name: "Risk",
      href: "/risk",
      icon: TrendingDown,
    },
    {
      name: "Agent Decisions",
      href: "/agent",
      icon: Activity,
    },
  ];

  const developerNav = [
    {
      name: "Simulator",
      href: "/simulator",
      icon: SlidersHorizontal,
    },
    {
      name: "LangGraph Flow",
      href: "/operations/graph",
      icon: Network,
    },
  ];

  return (
    <aside className="w-[230px] flex-shrink-0 bg-[#080D15] border-r border-[#151E2E] flex flex-col justify-between h-screen sticky top-0 select-none overflow-y-auto z-20">
      <div className="p-4 space-y-6">
        {/* VIREON Brand Header */}
        <div className="px-2 pt-1 pb-1">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Stylized Hex/V Monogram Icon */}
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 p-[1px] shadow-lg shadow-blue-900/30 group-hover:shadow-cyan-500/20 transition-all">
              <div className="w-full h-full bg-[#080D15] rounded-[7px] flex items-center justify-center relative overflow-hidden">
                {/* Glowing subtle V shape */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4l8 16 8-16" />
                </svg>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="font-extrabold text-[15px] tracking-wider text-white uppercase leading-none">
                VIREON
              </span>
              <span className="text-[8px] font-semibold tracking-widest text-slate-400 uppercase mt-1 leading-none">
                REVENUE INTELLIGENCE
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-5">
          {/* CORE */}
          <div className="space-y-1">
            <span className="px-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
              CORE
            </span>
            {coreNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-blue-950/80 to-cyan-950/40 text-white border-l-2 border-cyan-400 font-semibold shadow-sm shadow-cyan-950/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0E141C]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isActive ? "text-cyan-400" : "text-slate-400"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* INTELLIGENCE */}
          <div className="space-y-1">
            <span className="px-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
              INTELLIGENCE
            </span>
            {intelligenceNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-violet-950/80 to-indigo-950/40 text-white border-l-2 border-violet-400 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0E141C]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isActive ? "text-violet-400" : "text-slate-400"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* DEVELOPER */}
          <div className="space-y-1">
            <span className="px-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
              DEVELOPER
            </span>
            {developerNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-blue-950/80 to-indigo-950/40 text-white border-l-2 border-blue-400 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0E141C]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isActive ? "text-blue-400" : "text-slate-400"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar Footer: System Status & Version */}
      <div className="p-3 border-t border-[#151E2E] bg-[#060A10]/90 space-y-2.5 text-[11px]">
        <div className="space-y-1.5 px-1 pt-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-2">
            <span>SYSTEM STATUS</span>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All Systems Operational
            </span>
          </div>

          <div className="space-y-1 pt-1 border-t border-[#151E2E]/60 text-[10px] text-slate-400">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">PostgreSQL</span>
              <span className="text-emerald-400 font-medium">Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Razorpay</span>
              <span className="text-emerald-400 font-medium">Sandbox</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">LangGraph</span>
              <span className="text-violet-400 font-medium">Online</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">SSE Stream</span>
              <span className="text-cyan-400 font-medium">Streaming</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Gateway</span>
              <span className="text-emerald-400 font-medium">Online</span>
            </div>
          </div>
        </div>

        {/* Footer Version */}
        <div className="pt-2 border-t border-[#151E2E] px-1 flex items-center justify-between text-[9px] text-slate-400">
          <span>© 2026 VIREON</span>
          <span className="font-mono">v2.4.0</span>
        </div>
      </div>
    </aside>
  );
}
