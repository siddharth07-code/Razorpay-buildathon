"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShieldAlert,
  Bot,
  SlidersHorizontal,
  History,
  Activity,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { VireonLogo } from "@/components/brand/VireonLogo";

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleClose = () => setMobileOpen(false);

    window.addEventListener("vireon:toggle-sidebar", handleToggle);
    window.addEventListener("vireon:close-sidebar", handleClose);

    return () => {
      window.removeEventListener("vireon:toggle-sidebar", handleToggle);
      window.removeEventListener("vireon:close-sidebar", handleClose);
    };
  }, []);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const coreNav = [
    {
      name: "Overview",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Cases Queue",
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
  ];

  const renderNavContent = (isDrawer = false) => (
    <div className="flex flex-col justify-between h-full min-h-full">
      <div className="p-4 space-y-6">
        {/* VIREON Brand Header */}
        <div className="px-2 pt-1 pb-1 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <VireonLogo
              variant="full"
              size="sm"
              showTagline={true}
              animated={true}
            />
          </Link>

          {/* Close Button on Mobile Drawer */}
          {isDrawer && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#151E2E] transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
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
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 group ${
                    isActive
                      ? "bg-gradient-to-r from-blue-950/80 to-cyan-950/40 text-white border-l-2 border-cyan-400 font-semibold shadow-sm shadow-cyan-950/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0E141C] hover:translate-x-0.5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-3.5 h-3.5 transition-colors ${
                        isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-400"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 status-dot-active">
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
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 group ${
                    isActive
                      ? "bg-gradient-to-r from-violet-950/80 to-indigo-950/40 text-white border-l-2 border-violet-400 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0E141C] hover:translate-x-0.5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-3.5 h-3.5 transition-colors ${
                        isActive ? "text-violet-400" : "text-slate-400 group-hover:text-violet-400"
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
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 group ${
                    isActive
                      ? "bg-gradient-to-r from-blue-950/80 to-indigo-950/40 text-white border-l-2 border-blue-400 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0E141C] hover:translate-x-0.5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-3.5 h-3.5 transition-colors ${
                        isActive ? "text-blue-400" : "text-slate-400 group-hover:text-blue-400"
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
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar (visible >= lg: 1024px) */}
      <aside className="hidden lg:flex w-[230px] flex-shrink-0 bg-[#080D15] border-r border-[#151E2E] flex-col justify-between h-screen sticky top-0 select-none overflow-y-auto z-20">
        {renderNavContent(false)}
      </aside>

      {/* 2. Mobile / Tablet Responsive Drawer (visible < lg) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={() => setMobileOpen(false)}
          />

          {/* Slide-in Drawer Container */}
          <div className="relative w-[280px] max-w-[85vw] h-full bg-[#080D15] border-r border-[#151E2E] z-50 flex flex-col justify-between overflow-y-auto shadow-2xl animate-slideInLeft">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
