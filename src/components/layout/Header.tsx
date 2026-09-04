"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Calendar,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  PlusCircle,
  CheckCircle2,
  Database,
  Activity,
  Zap,
  RotateCcw,
  Menu,
  Check,
  Clock,
} from "lucide-react";

export interface DateRangePreset {
  id: string;
  label: string;
  sublabel: string;
  badge: string;
  days: number;
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    id: "today",
    label: "Today",
    sublabel: "Real-time intraday recovery & drop-offs",
    badge: "24H",
    days: 1,
  },
  {
    id: "7d",
    label: "Last 7 Days",
    sublabel: "Weekly batch & mandate retry cycle",
    badge: "7D",
    days: 7,
  },
  {
    id: "30d",
    label: "Last 30 Days",
    sublabel: "Standard rolling institutional billing period",
    badge: "30D",
    days: 30,
  },
  {
    id: "90d",
    label: "Last 90 Days",
    sublabel: "Quarterly recovery risk & ledger view",
    badge: "QTR",
    days: 90,
  },
  {
    id: "ytd",
    label: "Year to Date (YTD)",
    sublabel: "Fiscal year 2026 cumulative performance",
    badge: "YTD",
    days: -1,
  },
  {
    id: "all",
    label: "All Time",
    sublabel: "Unconstrained complete audit ledger",
    badge: "MAX",
    days: 0,
  },
];

export function Header({
  onQuickInject,
  onRefresh,
  pageTitle,
  dateRange: controlledDateRange,
  onDateRangeChange,
}: {
  onQuickInject?: () => void;
  onRefresh?: () => void;
  pageTitle?: string;
  dateRange?: string;
  onDateRangeChange?: (newRange: string) => void;
}) {
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectSuccess, setInjectSuccess] = useState<string | null>(null);
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const [showDateRangePopover, setShowDateRangePopover] = useState(false);
  const [internalDateRange, setInternalDateRange] = useState("Last 30 Days");

  const activeDateRange = controlledDateRange || internalDateRange;

  const dateMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Click-outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) {
        setShowDateRangePopover(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setShowStatusPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getFormattedSpan = (presetLabel: string) => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    const shortOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

    if (presetLabel === "Today") {
      return `${now.toLocaleDateString("en-US", options)} (Intraday)`;
    }
    if (presetLabel === "Last 7 Days") {
      const start = new Date(now.getTime() - 7 * 86400000);
      return `${start.toLocaleDateString("en-US", shortOptions)} – ${now.toLocaleDateString("en-US", options)}`;
    }
    if (presetLabel === "Last 30 Days") {
      const start = new Date(now.getTime() - 30 * 86400000);
      return `${start.toLocaleDateString("en-US", shortOptions)} – ${now.toLocaleDateString("en-US", options)}`;
    }
    if (presetLabel === "Last 90 Days") {
      const start = new Date(now.getTime() - 90 * 86400000);
      return `${start.toLocaleDateString("en-US", shortOptions)} – ${now.toLocaleDateString("en-US", options)}`;
    }
    if (presetLabel.startsWith("Year to Date") || presetLabel === "YTD") {
      const start = new Date(now.getFullYear(), 0, 1);
      return `${start.toLocaleDateString("en-US", shortOptions)} – ${now.toLocaleDateString("en-US", options)}`;
    }
    return "All Historic Telemetry";
  };

  const handleSelectDateRange = (label: string) => {
    setInternalDateRange(label);
    setShowDateRangePopover(false);
    if (onDateRangeChange) {
      onDateRangeChange(label);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      const res = await fetch("/api/demo/recovery/reset", { method: "POST" });
      if (res.ok) {
        setShowResetModal(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("Demo reset error:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const [form, setForm] = useState({
    customerName: "Aakash Verma",
    customerEmail: "finance@zenithedutech.in",
    customerPhone: "+919876543210",
    companyName: "Zenith Edutech Pvt Ltd",
    amount: "14999",
    method: "nach" as "nach" | "card" | "upi" | "netbanking",
    errorCode: "INSUFFICIENT_FUNDS" as any,
  });

  const handleInject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInjecting(true);
    setInjectSuccess(null);

    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "INJECT_FAILURE",
          ...form,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInjectSuccess(`Simulated ${form.errorCode} for ₹${Number(form.amount).toLocaleString("en-IN")}`);
        if (onQuickInject) onQuickInject();
        setTimeout(() => {
          setShowInjectModal(false);
          setInjectSuccess(null);
        }, 1800);
      }
    } catch (err) {
      console.error("Failed to inject simulation", err);
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <>
      <header className="h-14 bg-[#05080D]/95 backdrop-blur-md border-b border-[#151E2E] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-all">
        {/* Left: Mobile Hamburger + Global Search */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("vireon:toggle-sidebar"))}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-[#151E2E] rounded-lg transition-colors flex items-center justify-center shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5 text-slate-300" />
          </button>

          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search cases, customers..."
              className="w-full bg-[#080D15] border border-[#1A2333] hover:border-slate-700 focus:border-cyan-500/50 rounded-lg pl-8 pr-8 sm:pr-12 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-mono"
            />
            <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-400 bg-[#0F1622] px-1.5 py-0.5 rounded border border-[#1E293B]">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Date Range Dropdown + Reset + Refresh + System Status */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Functional Precision Date Filter Dropdown */}
          <div className="relative" ref={dateMenuRef}>
            <button
              type="button"
              onClick={() => {
                setShowDateRangePopover(!showDateRangePopover);
                setShowStatusPopover(false);
              }}
              className={`hidden md:flex items-center gap-2 bg-[#080D15] hover:bg-[#0E1524] text-xs px-2.5 py-1.5 rounded-lg border transition shadow-sm select-none ${
                showDateRangePopover
                  ? "border-cyan-400/80 text-white shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                  : "border-[#1A2333] hover:border-slate-700 text-slate-200"
              }`}
              title="Select analytical time horizon"
            >
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-[11px] font-mono tracking-tight">{activeDateRange}</span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 ml-0.5 transition-transform duration-200 ${
                  showDateRangePopover ? "rotate-180 text-cyan-400" : ""
                }`}
              />
            </button>

            {/* Date Range Precision Popover */}
            {showDateRangePopover && (
              <div className="absolute right-0 mt-2 w-72 bg-[#080D15] border border-[#1E293B] rounded-xl p-2.5 shadow-2xl z-50 text-xs space-y-2 animate-fadeIn backdrop-blur-xl">
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#1E293B] px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    TIME HORIZON
                  </span>
                  <span className="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.2 rounded">
                    ACTIVE
                  </span>
                </div>

                {/* Current Active Date Span Display */}
                <div className="bg-[#05080E] border border-[#151E2E] rounded-lg px-2.5 py-1.5">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">SELECTED SPAN</div>
                  <div className="text-[11px] font-mono font-semibold text-white truncate">
                    {getFormattedSpan(activeDateRange)}
                  </div>
                </div>

                {/* Preset Options */}
                <div className="space-y-1 pt-1">
                  {DATE_RANGE_PRESETS.map((preset) => {
                    const isSelected = activeDateRange === preset.label;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectDateRange(preset.label)}
                        className={`w-full text-left p-2 rounded-lg transition-all flex items-start justify-between gap-2 group ${
                          isSelected
                            ? "bg-cyan-950/30 border border-cyan-500/40 text-white"
                            : "hover:bg-[#0E1524] border border-transparent text-slate-300"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-bold font-mono ${
                                isSelected ? "text-cyan-300" : "text-white group-hover:text-cyan-400"
                              }`}
                            >
                              {preset.label}
                            </span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[#0F1622] border border-[#1E293B] text-slate-400 font-mono">
                              {preset.badge}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">{preset.sublabel}</div>
                        </div>

                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Reset Demo Button */}
          <button
            onClick={() => setShowResetModal(true)}
            title="Reset Demo Case"
            className="flex items-center gap-1.5 bg-[#080D15] border border-[#1A2333] hover:border-slate-700 hover:text-white text-slate-300 text-xs px-2 sm:px-2.5 py-1.5 rounded-lg transition active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400 transition-colors" />
            <span className="text-[11px] font-medium hidden sm:inline">Reset Demo</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh Data"
            className="w-8 h-8 flex items-center justify-center bg-[#080D15] border border-[#1A2333] hover:border-slate-700 hover:text-white text-slate-400 rounded-lg transition active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* System Status Dropdown Pill */}
          <div className="relative" ref={statusMenuRef}>
            <button
              onClick={() => {
                setShowStatusPopover(!showStatusPopover);
                setShowDateRangePopover(false);
              }}
              className="flex items-center gap-1.5 bg-[#080D15] border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse status-dot-active" />
              <span className="hidden sm:inline">SYSTEM OPERATIONAL</span>
              <span className="sm:hidden text-[10px]">LIVE</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
            </button>

            {/* Status Popover */}
            {showStatusPopover && (
              <div className="absolute right-0 mt-2 w-56 bg-[#080D15] border border-[#1A2333] rounded-xl p-3 shadow-2xl z-50 text-xs space-y-2 animate-fadeIn">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-[#1A2333]">
                  INFRASTRUCTURE TELEMETRY
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">PostgreSQL</span>
                    <span className="text-emerald-400 font-mono font-medium">CONNECTED</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Razorpay</span>
                    <span className="text-emerald-400 font-mono font-medium">SANDBOX</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">LangGraph</span>
                    <span className="text-violet-400 font-mono font-medium">ONLINE</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">SSE Stream</span>
                    <span className="text-cyan-400 font-mono font-medium">STREAMING</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Gateway</span>
                    <span className="text-emerald-400 font-mono font-medium">ONLINE</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Simulate Failure CTA */}
          <button
            onClick={() => setShowInjectModal(true)}
            className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-sm transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Simulate Failure</span>
          </button>
        </div>
      </header>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#080D15] border border-[#151E2E] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-white text-sm">RESET DEMO PORTFOLIO?</h3>
              <p className="text-xs text-slate-400">
                This will reset all 8 controlled demonstration cases (₹1,249 to ₹8,40,000) to their deterministic initial states.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                CANCEL
              </button>
              <button
                onClick={handleResetDemo}
                disabled={isResetting}
                className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition disabled:opacity-50"
              >
                {isResetting ? "RESETTING..." : "RESET"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Inject Modal */}
      {showInjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#080D15] border border-[#151E2E] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Simulate Razorpay Payment Failure</h3>
                  <p className="text-xs text-slate-400">Trigger sandbox webhook & test AI agent response</p>
                </div>
              </div>
              <button
                onClick={() => setShowInjectModal(false)}
                className="text-slate-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>

            {injectSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                <p className="text-emerald-400 font-semibold text-sm">Autonomous Case Initiated!</p>
                <p className="text-slate-400 text-xs">{injectSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleInject} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Customer / Merchant Name</label>
                  <input
                    type="text"
                    required
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="w-full bg-[#05080D] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Company Entity</label>
                    <input
                      type="text"
                      required
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      className="w-full bg-[#05080D] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Amount (₹ INR)</label>
                    <input
                      type="number"
                      required
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full bg-[#05080D] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Payment Method</label>
                    <select
                      value={form.method}
                      onChange={(e) => setForm({ ...form, method: e.target.value as any })}
                      className="w-full bg-[#05080D] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="nach">eNACH / Mandate</option>
                      <option value="card">Credit / Debit Card</option>
                      <option value="upi">UPI AutoPay</option>
                      <option value="netbanking">Net Banking</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Simulated Error Code</label>
                    <select
                      value={form.errorCode}
                      onChange={(e) => setForm({ ...form, errorCode: e.target.value })}
                      className="w-full bg-[#05080D] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS</option>
                      <option value="MANDATE_MAX_AMOUNT_EXCEEDED">MANDATE_EXCEEDED</option>
                      <option value="CARD_EXPIRED">CARD_EXPIRED</option>
                      <option value="BANK_SERVER_TIMEOUT">BANK_SERVER_TIMEOUT</option>
                      <option value="AUTHENTICATION_FAILED">AUTHENTICATION_FAILED</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isInjecting}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold py-2.5 rounded-lg shadow-md transition disabled:opacity-50"
                  >
                    {isInjecting ? "Injecting Event..." : "Simulate Failure Event"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
