"use client";

import React, { useState } from "react";
import { AlertTriangle, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";

export function SandboxBanner({ onResetData }: { onResetData?: () => void }) {
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) {
        setResetSuccess(true);
        if (onResetData) onResetData();
        setTimeout(() => setResetSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to reset seed data", err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-amber-500/10 via-razorpay-900/40 to-emerald-500/10 border-b border-amber-500/20 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-300">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
        <span className="font-semibold text-amber-400 uppercase tracking-wider text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
          Razorpay Sandbox Demo
        </span>
        <span className="text-slate-400 hidden sm:inline">
          Autonomous revenue recovery engine active in safe simulation mode. Real-time Indian currency (₹ INR).
        </span>
      </div>

      <div className="flex items-center gap-3">
        {resetSuccess && (
          <span className="flex items-center gap-1 text-emerald-400 font-medium animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Reset to initial state
          </span>
        )}
        <button
          onClick={handleReset}
          disabled={isResetting}
          className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white px-2.5 py-1 rounded border border-slate-700 transition font-medium disabled:opacity-50"
          title="Reset database to seed Indian merchant records"
        >
          <RefreshCw className={`w-3 h-3 ${isResetting ? "animate-spin text-razorpay-400" : ""}`} />
          {isResetting ? "Resetting..." : "Reset Demo Data"}
        </button>
      </div>
    </div>
  );
}
