"use client";

import React, { useState } from "react";
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
} from "lucide-react";

export function Header({
  onQuickInject,
  onRefresh,
  pageTitle,
}: {
  onQuickInject?: () => void;
  onRefresh?: () => void;
  pageTitle?: string;
}) {
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectSuccess, setInjectSuccess] = useState<string | null>(null);
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const [dateRange, setDateRange] = useState("Last 30 Days");

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
              className="w-full bg-[#080D15] border border-[#1A2333] hover:border-slate-700 focus:border-cyan-500/50 rounded-lg pl-8 pr-8 sm:pr-12 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
            />
            <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-400 bg-[#0F1622] px-1.5 py-0.5 rounded border border-[#1E293B]">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Date Range Dropdown + Reset + Refresh + System Status */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Date Filter */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#080D15] border border-[#1A2333] hover:border-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg transition cursor-pointer select-none">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-[11px]">{dateRange}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
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
          <div className="relative">
            <button
              onClick={() => setShowStatusPopover(!showStatusPopover)}
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
