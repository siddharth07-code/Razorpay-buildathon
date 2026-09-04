"use client";

import React from "react";
import Link from "next/link";
import { HolographicVireonVisual } from "@/components/dashboard/HolographicVireonVisual";
import GhostFibers from "@/components/GhostFibers";
import { VireonLogo } from "@/components/brand/VireonLogo";
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
  AlertCircle,
  FileCheck,
  ShieldAlert,
  ArrowDown,
} from "lucide-react";

export default function VireonLandingPage() {
  return (
    <div className="min-h-screen bg-[#05080D] text-slate-100 selection:bg-blue-600 selection:text-white -m-4 sm:-m-5 lg:-m-6 overflow-x-hidden">
      {/* Top Navbar */}
      <nav className="h-16 border-b border-[#151E2E] bg-[#080D15]/85 backdrop-blur-lg px-4 sm:px-8 lg:px-12 flex items-center justify-between sticky top-0 z-50 transition-all">
        <Link href="/" className="flex items-center gap-3">
          <VireonLogo variant="full" size="md" showTagline={true} animated={true} />
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
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
            href="/ghost-fibers"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-medium transition hidden md:inline"
          >
            GhostFibers
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold px-3.5 sm:px-4 py-2 rounded-xl shadow-lg shadow-blue-900/30 transition hover:-translate-y-0.5 active:scale-[0.98] group"
          >
            <span>LAUNCH PLATFORM</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </nav>

      {/* SECTION 1: HERO */}
      <section className="relative px-4 sm:px-8 lg:px-12 pt-12 sm:pt-16 pb-20 sm:pb-24 max-w-7xl mx-auto overflow-hidden">
        {/* Animated Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#151E2E18_1px,transparent_1px),linear-gradient(to_bottom,#151E2E18_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none animate-grid-drift" />

        {/* Ambient GhostFibers Neural Wave Shader Layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-45">
          <GhostFibers
            lineColor="#071224"
            glowColor="#00d8ff"
            speed={0.12}
            scale={2.4}
            layers={6}
            waveAmplitude={0.012}
            waveFrequency={2.5}
            waveSpeed={-0.5}
            layerSpeed={0.06}
            glowIntensity={1.5}
            brightness={1.8}
            blueBoost={1.3}
            vignette={0.8}
            grain={0.03}
            dpr={1.5}
          />
        </div>

        {/* Slow Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-blue-600/15 via-cyan-500/10 to-violet-600/15 blur-[130px] pointer-events-none animate-pulse-glow" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-12 items-center relative z-10">
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E1522] border border-cyan-500/30 text-cyan-400 text-[11px] font-semibold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse status-dot-active" />
              <span>REVENUE INTELLIGENCE INFRASTRUCTURE</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Recover Revenue.
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 mt-2">
                Intelligently.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              VIREON is autonomous revenue intelligence infrastructure that turns failed, delayed, and abandoned transactions into an institutional recovery pipeline.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                href="/"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-xl shadow-blue-900/40 transition hover:-translate-y-0.5 active:scale-[0.98] group"
              >
                <span>ENTER COMMAND CENTER</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/operations"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#080D15] hover:bg-[#0E141C] text-slate-200 border border-[#151E2E] hover:border-slate-700 text-xs font-semibold px-6 py-3.5 rounded-xl transition hover:-translate-y-0.5 active:scale-[0.98] group"
              >
                <span>WATCH RECOVERY FLOW</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Micro Institutional Trust Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[#151E2E]/80">
              <div className="bg-[#080D15]/60 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-[#151E2E]">
                <div className="text-xl font-bold text-white font-mono">₹12.48 Cr+</div>
                <div className="text-[10px] text-slate-400 uppercase font-medium">Protected Revenue</div>
              </div>
              <div className="bg-[#080D15]/60 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-[#151E2E]">
                <div className="text-xl font-bold text-cyan-400 font-mono">68.3%</div>
                <div className="text-[10px] text-slate-400 uppercase font-medium">Autonomous Recovery</div>
              </div>
              <div className="bg-[#080D15]/60 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-[#151E2E]">
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
      <section className="px-4 sm:px-8 lg:px-12 py-16 sm:py-20 border-t border-[#151E2E] bg-[#060A10]/60">
        <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12 text-center">
          <div className="space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
              THE REVENUE RECOVERY ENGINE
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              A continuous, closed-loop financial recovery architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1: Detect */}
            <div className="bg-[#080D15] border border-[#151E2E] p-5 sm:p-6 rounded-2xl text-left space-y-3 relative overflow-hidden group hover:border-blue-500/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(59,130,246,0.08)] transition-all duration-300">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-bold text-xs flex items-center justify-center group-hover:scale-105 transition-transform">
                01
              </div>
              <h3 className="text-base font-bold text-white">DETECT</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ingests gateway webhooks, mandate dropoffs, cart abandonment signals, and overdue ledger accounts in real-time.
              </p>
            </div>

            {/* Step 2: Diagnose */}
            <div className="bg-[#080D15] border border-[#151E2E] p-5 sm:p-6 rounded-2xl text-left space-y-3 relative overflow-hidden group hover:border-cyan-500/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(34,211,238,0.08)] transition-all duration-300">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center group-hover:scale-105 transition-transform">
                02
              </div>
              <h3 className="text-base font-bold text-white">DIAGNOSE</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Classifies root causes across bank downtime, authentication errors, balance insufficiencies, and customer friction.
              </p>
            </div>

            {/* Step 3: Decide */}
            <div className="bg-[#080D15] border border-[#151E2E] p-5 sm:p-6 rounded-2xl text-left space-y-3 relative overflow-hidden group hover:border-violet-500/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(139,92,246,0.08)] transition-all duration-300">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 font-mono font-bold text-xs flex items-center justify-center group-hover:scale-105 transition-transform">
                03
              </div>
              <h3 className="text-base font-bold text-white">DECIDE</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Formulates optimal recovery strategy while enforcing rigid policy caps and mandatory human sign-off gates.
              </p>
            </div>

            {/* Step 4: Recover */}
            <div className="bg-[#080D15] border border-[#151E2E] p-5 sm:p-6 rounded-2xl text-left space-y-3 relative overflow-hidden group hover:border-emerald-500/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(16,185,129,0.08)] transition-all duration-300">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center group-hover:scale-105 transition-transform">
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

      {/* SECTION 3: REVENUE STREAMS */}
      <section className="px-4 sm:px-8 lg:px-12 py-16 sm:py-20 border-t border-[#151E2E] max-w-7xl mx-auto space-y-10 sm:space-y-12">
        <div className="space-y-2 text-center max-w-2xl mx-auto">
          <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
            REVENUE STREAMS
          </h2>
          <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Universal recovery coverage across modern transaction failure modes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Card Failures */}
          <div className="bg-[#080D15] border border-[#151E2E] p-5 sm:p-6 rounded-2xl space-y-3 hover:border-blue-500/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(59,130,246,0.08)] transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 group-hover:translate-x-0.5 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">Card Failures</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant dynamic payment link dispatch and optimal retry intervals for expired credentials, network timeouts, and balance insufficiencies.
            </p>
          </div>

          {/* 2. 3DS Failures */}
          <div className="bg-[#080D15] border border-[#151E2E] p-5 sm:p-6 rounded-2xl space-y-3 hover:border-cyan-500/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(34,211,238,0.08)] transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 group-hover:translate-x-0.5 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">3DS Failures</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Frictionless fallback channels when OTP verification drops or issuer ACS servers timeout during 3D-Secure challenges.
            </p>
          </div>

          {/* 3. Checkout Abandonment */}
          <div className="bg-[#080D15] border border-[#151E2E] p-5 sm:p-6 rounded-2xl space-y-3 hover:border-indigo-500/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 group-hover:translate-x-0.5 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">Checkout Abandonment</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time cart dropoff triage with pre-filled 1-click Razorpay payment links and intelligent intent incentives.
            </p>
          </div>

          {/* 4. Recurring Failures */}
          <div className="bg-[#080D15] border border-[#151E2E] p-5 sm:p-6 rounded-2xl space-y-3 hover:border-violet-500/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(139,92,246,0.08)] transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center group-hover:scale-110 group-hover:translate-x-0.5 transition-transform">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">Recurring Failures</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Adaptive eNACH/UPI AutoPay smart dunning workflows, grace period protections, and mandate lifecycle recovery.
            </p>
          </div>

          {/* 5. Corporate Invoices */}
          <div className="bg-[#080D15] border border-[#151E2E] p-5 sm:p-6 rounded-2xl space-y-3 hover:border-emerald-500/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(16,185,129,0.08)] transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 group-hover:translate-x-0.5 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">Corporate Invoices</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              B2B receivables ledgering, formal enterprise dunning sequences, and multi-currency payment collection tracking.
            </p>
          </div>

          {/* 6. Broken Commitments */}
          <div className="bg-[#080D15] border border-[#151E2E] p-5 sm:p-6 rounded-2xl space-y-3 hover:border-amber-500/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(245,158,11,0.08)] transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 group-hover:translate-x-0.5 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">Broken Commitments</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated re-engagement workflows when promised settlement dates expire or installment schedules breach thresholds.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: CONTROLLED AUTONOMY & GOVERNANCE */}
      <section className="px-4 sm:px-8 lg:px-12 py-16 sm:py-20 border-t border-[#151E2E] bg-[#060A10]/60">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="max-w-3xl space-y-3">
            <div className="text-xs font-bold text-violet-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span>BOUNDED AUTONOMY & POLICY CONTROLS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Enterprise financial guardrails you can trust.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              VIREON never behaves unpredictably with enterprise capital. High-value transactions are subject to deterministic state-machine invariants and mandatory human approval gates.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Policy Control Threshold Visual Card */}
            <div className="lg:col-span-7 bg-[#080D15] border border-[#151E2E] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-[#151E2E] text-xs font-mono">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  POLICY ENGINE • THRESHOLD RULE #POL-01
                </span>
                <span className="text-cyan-400 text-[10px] font-bold">STATE ENFORCED</span>
              </div>

              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>&lt; ₹1,00,000 : AUTOMATED RECOVERY</span>
                </div>
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse status-dot-active" />
                  <span>≥ ₹1,00,000 : HUMAN APPROVAL</span>
                </div>
              </div>

              {/* Visual Animated Policy Threshold Bar */}
              <div className="relative py-6">
                {/* Horizontal Track */}
                <div className="h-3 w-full bg-[#151E2E] rounded-full overflow-hidden flex shadow-inner">
                  <div className="w-1/2 h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500" />
                  <div className="w-1/2 h-full bg-gradient-to-r from-violet-500 via-amber-500 to-rose-500" />
                </div>

                {/* ₹1L Pinpoint Threshold Marker */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-[#080D15] border-2 border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.9)] flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-300 animate-pulse status-dot-active" />
                  </div>
                  <div className="mt-2 px-3 py-1 rounded-full bg-[#0E1522] border border-cyan-400/50 text-[10px] font-mono font-bold text-cyan-300 whitespace-nowrap shadow-md">
                    ₹1,00,000 POLICY CAP
                  </div>
                </div>
              </div>

              {/* Sub-text Explanation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono pt-3 border-t border-[#151E2E]/80">
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">LOWER VALUE MODE</div>
                  <div className="text-white font-medium text-[11px]">100% Autonomous 1-click links &amp; optimal retry sequences.</div>
                </div>
                <div className="space-y-1 sm:text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">ENTERPRISE TIER MODE</div>
                  <div className="text-amber-300 font-medium text-[11px]">Mandatory operator sign-off in Command Center before action.</div>
                </div>
              </div>
            </div>

            {/* Right: Policy Evaluation Ledger */}
            <div className="lg:col-span-5 bg-[#080D15] border border-[#151E2E] p-6 rounded-2xl space-y-4 font-mono text-xs text-slate-300 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#151E2E] text-[10px] text-slate-400">
                <span className="text-cyan-400 font-semibold">POLICY_EVALUATION_REPORT</span>
                <span>AUDIT #POL-8902</span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div><span className="text-slate-500">&gt; Target Case:</span> REC-2026-00123</div>
                <div><span className="text-slate-500">&gt; Invoice Amount:</span> <span className="font-bold text-white font-mono">₹1,24,500</span></div>
                <div><span className="text-slate-500">&gt; Threshold Check:</span> <span className="text-amber-400 font-semibold">EXCEEDS ₹1,00,000 CAP</span></div>
                <div><span className="text-slate-500">&gt; Autonomous Action:</span> <span className="text-rose-400 font-semibold">SUSPENDED</span></div>
                <div><span className="text-slate-500">&gt; State Machine:</span> <span className="text-violet-400 font-semibold">AWAITING_APPROVAL</span></div>
                <div><span className="text-slate-500">&gt; Required Sign-Off:</span> <span className="text-emerald-400 font-semibold">PENDING_OPERATOR</span></div>
              </div>
              <div className="pt-3 border-t border-[#151E2E] text-[10px] text-slate-400">
                Deterministic invariant enforced by LangGraph state checkpoint &amp; PostgreSQL.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: REAL-TIME SETTLEMENT FLOW */}
      <section className="px-4 sm:px-8 lg:px-12 py-16 sm:py-20 border-t border-[#151E2E] max-w-7xl mx-auto space-y-10 sm:space-y-12 text-center">
        <div className="space-y-2 max-w-2xl mx-auto">
          <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
            REAL-TIME SETTLEMENT FLOW
          </h2>
          <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Razorpay Sandbox to PostgreSQL atomic reconciliation.
          </p>
        </div>

        {/* 5-Stage Animated Progression Flow */}
        <div className="bg-[#080D15] border border-[#151E2E] rounded-2xl p-6 sm:p-8 max-w-5xl mx-auto shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
            {/* Stage 1: Recovery Action */}
            <div className="w-full md:w-44 p-4 rounded-xl bg-[#0B111B] border border-blue-500/20 text-center space-y-1">
              <div className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-wider">STAGE 01</div>
              <div className="font-bold text-white text-xs">RECOVERY ACTION</div>
              <div className="text-[10px] text-slate-400">Payment link sent</div>
            </div>

            <div className="text-cyan-400 font-mono font-bold rotate-90 md:rotate-0 animate-pulse">→</div>

            {/* Stage 2: Razorpay */}
            <div className="w-full md:w-44 p-4 rounded-xl bg-[#0B111B] border border-cyan-500/20 text-center space-y-1">
              <div className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-wider">STAGE 02</div>
              <div className="font-bold text-white text-xs">RAZORPAY</div>
              <div className="text-[10px] text-slate-400">Payment captured</div>
            </div>

            <div className="text-cyan-400 font-mono font-bold rotate-90 md:rotate-0 animate-pulse">→</div>

            {/* Stage 3: Verification */}
            <div className="w-full md:w-44 p-4 rounded-xl bg-[#0B111B] border border-violet-500/20 text-center space-y-1">
              <div className="text-[10px] text-violet-400 font-mono font-bold uppercase tracking-wider">STAGE 03</div>
              <div className="font-bold text-white text-xs">VERIFICATION</div>
              <div className="text-[10px] text-slate-400">HMAC-SHA256 signature</div>
            </div>

            <div className="text-cyan-400 font-mono font-bold rotate-90 md:rotate-0 animate-pulse">→</div>

            {/* Stage 4: PostgreSQL */}
            <div className="w-full md:w-44 p-4 rounded-xl bg-[#0B111B] border border-indigo-500/20 text-center space-y-1">
              <div className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">STAGE 04</div>
              <div className="font-bold text-white text-xs">POSTGRESQL</div>
              <div className="text-[10px] text-slate-400">Atomic ledger commit</div>
            </div>

            <div className="text-cyan-400 font-mono font-bold rotate-90 md:rotate-0 animate-pulse">→</div>

            {/* Stage 5: Recovered */}
            <div className="w-full md:w-44 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-center space-y-1 shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden">
              <div className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>STAGE 05</span>
              </div>
              <div className="font-bold text-emerald-400 text-xs">RECOVERED</div>
              <div className="text-[10px] text-emerald-300 font-mono font-bold">₹25,000 Captured</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5.5: NEURAL REVENUE FABRIC (GHOST FIBERS) */}
      <section className="px-4 sm:px-8 lg:px-12 py-16 sm:py-20 border-t border-[#151E2E] bg-[#05080E] relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-8 text-center">
          <div className="space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E1522] border border-cyan-500/30 text-cyan-400 text-[11px] font-semibold tracking-wider uppercase">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>NEURAL RECOVERY FABRIC</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Real-Time Procedural Fiber Waveforms
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              GPU-accelerated WebGL shader dynamics powered by <code className="text-cyan-300 font-mono">ogl</code>. Visualizing continuous payment topology and autonomous resolution loops.
            </p>
          </div>

          {/* Usage Example: 100% width, 600px height, relative */}
          <div className="rounded-2xl border border-[#151E2E] overflow-hidden shadow-2xl relative bg-[#04060A]">
            <div style={{ width: '100%', height: '600px', position: 'relative' }}>
              <GhostFibers
                lineColor="#0e0e35"
                glowColor="#a0347d"
                speed={0.2}
                scale={2}
                rotation={0}
                rotationSpeed={0.25}
                layers={8}
                waveAmplitude={0.015}
                waveFrequency={3}
                waveSpeed={-0.85}
                layerSpeed={0.08}
                twist={0.1}
                twistFrequency={5}
                twistSpeed={1.2}
                lineFrequency={5}
                lineSpacing={2}
                lineSharpness={16}
                glowFalloff={10}
                glowIntensity={1.6}
                brightness={2}
                blueBoost={1.25}
                vignette={0.8}
                grain={0.05}
                dpr={2}
              />

              {/* Floating Institutional Badge */}
              <div className="absolute bottom-5 left-5 z-10 bg-[#080D15]/80 backdrop-blur-md border border-[#151E2E] rounded-xl px-4 py-2.5 text-left font-mono text-xs text-slate-300 pointer-events-none">
                <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                  NEURAL_FIBER_TELEMETRY
                </div>
                <div className="text-[11px] text-slate-400">
                  GPU Shader • 8 Concurrent Wave Layers • WebGL 2.0
                </div>
              </div>

              <div className="absolute top-4 right-4 z-10">
                <Link
                  href="/ghost-fibers"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#080D15]/90 backdrop-blur-md border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold hover:bg-cyan-950/50 hover:border-cyan-400 transition shadow-lg"
                >
                  <span>Interactive Controls &amp; Palettes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: FINAL CTA */}
      <section className="px-4 sm:px-8 lg:px-12 py-20 sm:py-24 border-t border-[#151E2E] bg-gradient-to-b from-[#080D15] to-[#04060A] text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          RECOVER REVENUE. BUILD WITH VIREON.
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Deploy institutional revenue intelligence infrastructure across your payment stack today.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold px-8 py-4 rounded-xl shadow-2xl shadow-blue-900/50 transition hover:-translate-y-0.5 active:scale-[0.98] group"
          >
            <span>ENTER COMMAND CENTER</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer className="border-t border-[#151E2E] bg-[#05080D] px-4 sm:px-8 lg:px-12 py-8 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <VireonLogo variant="full" size="sm" showTagline={true} />
        <div className="font-mono text-[11px] text-slate-400">
          © 2026 VIREON. Revenue Intelligence Infrastructure.
        </div>
      </footer>
    </div>
  );
}
