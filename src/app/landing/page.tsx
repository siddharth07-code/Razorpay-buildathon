"use client";

import React from "react";
import Link from "next/link";
import { HolographicVireonVisual } from "@/components/dashboard/HolographicVireonVisual";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  CreditCard,
  RotateCcw,
  ShoppingCart,
  Building2,
  CheckCircle2,
  Lock,
  Layers,
  Activity,
  Terminal,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function VireonLandingPage() {
  return (
    <div className="min-h-screen bg-[#05080D] text-slate-100 selection:bg-blue-600 selection:text-white -m-4 sm:-m-5 lg:-m-6">
      {/* Top Navbar */}
      <nav className="h-16 border-b border-[#151E2E] bg-[#080D15]/80 backdrop-blur-lg px-6 sm:px-12 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-blue-900/30">
            <div className="w-full h-full bg-[#080D15] rounded-[7px] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-cyan-400" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 4l8 16 8-16" />
              </svg>
            </div>
          </div>
          <span className="font-extrabold text-lg text-white tracking-widest uppercase">VIREON</span>
          <span className="hidden md:inline text-[9px] font-mono text-slate-400 border-l border-slate-700 pl-3 uppercase">
            Revenue Intelligence Infrastructure
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs text-slate-300 hover:text-white font-medium transition hidden sm:inline"
          >
            Command Center
          </Link>
          <Link
            href="/cases"
            className="text-xs text-slate-300 hover:text-white font-medium transition hidden sm:inline"
          >
            Cases
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-blue-900/30 transition"
          >
            <span>LAUNCH PLATFORM</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* SECTION 1: HERO */}
      <section className="relative px-6 sm:px-12 pt-16 pb-24 max-w-7xl mx-auto overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-blue-600/10 via-cyan-500/10 to-violet-600/10 blur-[120px] pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E1522] border border-cyan-500/30 text-cyan-400 text-[11px] font-semibold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>REVENUE INTELLIGENCE INFRASTRUCTURE</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              VIREON
              <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 mt-2">
                Revenue Intelligence Infrastructure
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Turn failed, delayed and abandoned revenue into an intelligent recovery pipeline.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                href="/"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-xl shadow-blue-900/40 transition"
              >
                <span>ENTER COMMAND CENTER</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/operations"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#080D15] hover:bg-[#0E141C] text-slate-200 border border-[#151E2E] text-xs font-semibold px-6 py-3.5 rounded-xl transition"
              >
                <span>WATCH RECOVERY FLOW</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>

            {/* Micro Institutional Trust Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#151E2E]/80">
              <div>
                <div className="text-xl font-bold text-white font-mono">₹12.48 Cr+</div>
                <div className="text-[10px] text-slate-400 uppercase font-medium">Protected Revenue</div>
              </div>
              <div>
                <div className="text-xl font-bold text-cyan-400 font-mono">68.3%</div>
                <div className="text-[10px] text-slate-400 uppercase font-medium">Autonomous Recovery</div>
              </div>
              <div>
                <div className="text-xl font-bold text-emerald-400 font-mono">&lt; 2.7 hrs</div>
                <div className="text-[10px] text-slate-400 uppercase font-medium">Mean Resolution</div>
              </div>
            </div>
          </div>

          {/* Right Column: Holographic VIREON Structure */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md">
              <HolographicVireonVisual />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE REVENUE RECOVERY ENGINE */}
      <section className="px-6 sm:px-12 py-20 border-t border-[#151E2E] bg-[#060A10]/60">
        <div className="max-w-7xl mx-auto space-y-12 text-center">
          <div className="space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
              THE REVENUE RECOVERY ENGINE
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              A continuous, closed-loop financial recovery architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1: Detect */}
            <div className="bg-[#080D15] border border-[#151E2E] p-6 rounded-2xl text-left space-y-3 relative overflow-hidden group hover:border-blue-500/30 transition">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-bold text-xs flex items-center justify-center">
                01
              </div>
              <h3 className="text-base font-bold text-white">DETECT</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ingests gateway webhooks, mandate dropoffs, cart abandonment signals, and overdue ledger accounts in real-time.
              </p>
            </div>

            {/* Step 2: Diagnose */}
            <div className="bg-[#080D15] border border-[#151E2E] p-6 rounded-2xl text-left space-y-3 relative overflow-hidden group hover:border-cyan-500/30 transition">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center">
                02
              </div>
              <h3 className="text-base font-bold text-white">DIAGNOSE</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Classifies root causes across bank downtime, authentication errors, balance insufficiencies, and customer friction.
              </p>
            </div>

            {/* Step 3: Decide */}
            <div className="bg-[#080D15] border border-[#151E2E] p-6 rounded-2xl text-left space-y-3 relative overflow-hidden group hover:border-violet-500/30 transition">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 font-mono font-bold text-xs flex items-center justify-center">
                03
              </div>
              <h3 className="text-base font-bold text-white">DECIDE</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Formulates optimal recovery strategy while enforcing rigid policy caps and mandatory human sign-off gates.
              </p>
            </div>

            {/* Step 4: Recover */}
            <div className="bg-[#080D15] border border-[#151E2E] p-6 rounded-2xl text-left space-y-3 relative overflow-hidden group hover:border-emerald-500/30 transition">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                04
              </div>
              <h3 className="text-base font-bold text-white">RECOVER</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Executes 1-click Razorpay payment links, interactive WhatsApp dunning, or smart retries with HMAC verified settlement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: FOUR REVENUE STREAMS */}
      <section className="px-6 sm:px-12 py-20 border-t border-[#151E2E] max-w-7xl mx-auto space-y-12">
        <div className="space-y-2 text-center max-w-2xl mx-auto">
          <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
            FOUR REVENUE STREAMS
          </h2>
          <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Universal recovery coverage across modern transaction channels.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Stream 1 */}
          <div className="bg-[#080D15] border border-[#151E2E] p-5 rounded-2xl space-y-3 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">PAYMENTS</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant dynamic payment link dispatch and optimal mandate retry intervals for failed card and UPI payments.
            </p>
          </div>

          {/* Stream 2 */}
          <div className="bg-[#080D15] border border-[#151E2E] p-5 rounded-2xl space-y-3 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">SUBSCRIPTIONS</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Smart dunning workflows, grace period protection, and customer communication before recurring subscription cancellation.
            </p>
          </div>

          {/* Stream 3 */}
          <div className="bg-[#080D15] border border-[#151E2E] p-5 rounded-2xl space-y-3 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">CHECKOUT</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Abandoned checkout recovery with pre-filled payment links and intelligent intent incentives.
            </p>
          </div>

          {/* Stream 4 */}
          <div className="bg-[#080D15] border border-[#151E2E] p-5 rounded-2xl space-y-3 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">B2B RECEIVABLES</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Overdue invoice tracking, formal dunning reminders, structured promise-to-pay ledgering, and partial settlement reconciliation.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: CONTROLLED AUTONOMY & GOVERNANCE */}
      <section className="px-6 sm:px-12 py-20 border-t border-[#151E2E] bg-[#060A10]/60">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="text-xs font-bold text-violet-400 uppercase tracking-widest">
              BOUNDED AUTONOMY & POLICY CONTROLS
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Enterprise financial guardrails you can trust.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              VIREON never behaves unpredictably with enterprise revenue. Every action complies with mathematical state machine invariants and strict policy rules.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <strong className="text-white">Intelligence Proposes:</strong> Multi-agent analysis diagnoses root cause and recommends recovery strategy.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <strong className="text-white">Policy Controls:</strong> Enforces cooldown periods, retry limits, and regulatory anti-spam caps.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <strong className="text-white">Human Approval Gates:</strong> Mandatory human sign-off for any transaction $\ge$ ₹1,00,000.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <strong className="text-white">PostgreSQL Authoritative:</strong> Financial truth and BigInt paise precision committed directly to database.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#080D15] border border-[#151E2E] p-6 rounded-2xl space-y-4 font-mono text-xs text-slate-300 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#151E2E] text-[10px] text-slate-400">
              <span className="text-cyan-400">POLICY_EVALUATION_REPORT</span>
              <span>AUDIT #POL-8902</span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div><span className="text-slate-500">&gt; Case:</span> REC-2026-00123 (₹1,24,500)</div>
              <div><span className="text-slate-500">&gt; Threshold Check:</span> <span className="text-amber-400">EXCEEDS ₹1,00,000 CAP</span></div>
              <div><span className="text-slate-500">&gt; Auto-Execution:</span> <span className="text-rose-400">BLOCKED</span></div>
              <div><span className="text-slate-500">&gt; State Transition:</span> <span className="text-violet-400">AWAITING_APPROVAL</span></div>
              <div><span className="text-slate-500">&gt; Human Decision Required:</span> <span className="text-emerald-400">PENDING_OPERATOR</span></div>
            </div>
            <div className="pt-3 border-t border-[#151E2E] text-[10px] text-slate-500">
              Deterministic invariant strictly verified by LangGraph state checkpoint.
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: REAL-TIME SETTLEMENT */}
      <section className="px-6 sm:px-12 py-20 border-t border-[#151E2E] max-w-7xl mx-auto space-y-12 text-center">
        <div className="space-y-2 max-w-2xl mx-auto">
          <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
            REAL-TIME SETTLEMENT
          </h2>
          <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Razorpay Sandbox to PostgreSQL atomic reconciliation.
          </p>
        </div>

        <div className="bg-[#080D15] border border-[#151E2E] rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center text-xs">
            <div className="p-4 rounded-xl bg-[#0B111B] border border-blue-500/20">
              <div className="font-bold text-white">Razorpay</div>
              <div className="text-[10px] text-slate-400">Payment Capture</div>
            </div>

            <div className="text-cyan-400 font-mono font-bold">→</div>

            <div className="p-4 rounded-xl bg-[#0B111B] border border-cyan-500/20">
              <div className="font-bold text-white">Webhook</div>
              <div className="text-[10px] text-slate-400">HMAC-SHA256</div>
            </div>

            <div className="text-cyan-400 font-mono font-bold">→</div>

            <div className="p-4 rounded-xl bg-[#0B111B] border border-emerald-500/20">
              <div className="font-bold text-emerald-400">PostgreSQL</div>
              <div className="text-[10px] text-slate-400">RECOVERED State</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: FINAL CTA */}
      <section className="px-6 sm:px-12 py-24 border-t border-[#151E2E] bg-gradient-to-b from-[#080D15] to-[#04060A] text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          RECOVER REVENUE. BUILD WITH VIREON.
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Deploy institutional revenue intelligence infrastructure across your payment stack today.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold px-8 py-4 rounded-xl shadow-2xl shadow-blue-900/50 transition"
          >
            <span>ENTER COMMAND CENTER</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer className="border-t border-[#151E2E] bg-[#05080D] px-6 sm:px-12 py-8 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white tracking-wider">VIREON</span>
          <span>— Revenue Intelligence Infrastructure</span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          © 2026 VIREON. Enterprise Edition v2.4.0.
        </div>
      </footer>
    </div>
  );
}
