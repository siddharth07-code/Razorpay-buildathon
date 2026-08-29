"use client";

import React, { useState } from "react";
import {
  Play,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { LiveRecoveryDemoModal } from "./LiveRecoveryDemoModal";

export function DemoTriggerBanner({
  onRecoveryCompleted,
}: {
  onRecoveryCompleted?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 p-5 sm:p-6 shadow-xl shadow-indigo-950/20">
        {/* Glow effect */}
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-razorpay-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-500/30 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Autonomous Multi-Agent Recovery Engine
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                144/144 TESTS VERIFIED
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Razorpay Intelligent Autonomous Recovery
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Experience the end-to-end multi-agent pipeline: autonomous risk triage, root cause diagnosis, dynamic policy guardrails with high-value approval gates, and 1-click Razorpay dynamic settlement links.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                ⚡ 1-Click Razorpay Dynamic Links
              </span>
              <span className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                🛡️ &ge; ₹1,00,000 Human-in-the-Loop Policy Gate
              </span>
              <span className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                🎯 100% Integer Paise Financial Precision
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-razorpay-600 to-indigo-600 hover:from-razorpay-500 hover:to-indigo-500 text-white text-xs font-bold py-3 px-5 rounded-xl shadow-lg shadow-razorpay-900/40 border border-razorpay-400/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START RECOVERY DEMO</span>
            </button>

            <Link
              href="/operations"
              className="flex items-center justify-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl border border-slate-700 transition"
            >
              <span>Operations Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Live Interactive Recovery Demo Modal */}
      <LiveRecoveryDemoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onRecoveryCompleted={onRecoveryCompleted}
      />
    </>
  );
}
