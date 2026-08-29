"use client";

import React, { useState } from "react";
import { QuickSimulator } from "@/components/dashboard/QuickSimulator";
import {
  SlidersHorizontal,
  PlusCircle,
  CheckCircle2,
  Terminal,
  RefreshCw,
  Sparkles,
  Send,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Check,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

interface ActiveSimulationSession {
  caseId: string;
  caseNumber: string;
  paymentId: string;
  customerName: string;
  amount: number;
  method: string;
  errorCode: string;
  status: "AWAITING_PAYMENT" | "RECOVERED";
  paymentLinkUrl?: string;
  timestamp: string;
}

export default function SimulatorPage() {
  const [form, setForm] = useState({
    customerName: "Praveen Nair",
    customerEmail: "praveen@aeroflow.in",
    customerPhone: "+919876598765",
    companyName: "AeroFlow Aerospace India",
    amount: "45000",
    method: "nach" as "nach" | "card" | "upi" | "netbanking",
    errorCode: "INSUFFICIENT_FUNDS" as any,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSimulationSession | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [responseLog, setResponseLog] = useState<any[]>([]);

  const handleCustomInject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

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
        const session: ActiveSimulationSession = {
          caseId: data.caseId,
          caseNumber: data.caseNumber,
          paymentId: data.paymentId,
          customerName: form.customerName,
          amount: Number(form.amount),
          method: form.method,
          errorCode: form.errorCode,
          status: "AWAITING_PAYMENT",
          paymentLinkUrl: `https://rzp.io/i/demo_sim_${data.caseNumber?.toLowerCase()}`,
          timestamp: new Date().toLocaleTimeString(),
        };

        setActiveSession(session);
        setResponseLog((prev) => [
          {
            timestamp: new Date().toLocaleTimeString(),
            status: "SUCCESS",
            type: "FAILURE_INGESTED",
            message: data.message,
            caseNumber: data.caseNumber,
            caseId: data.caseId,
            details: form,
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      setResponseLog((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          status: "ERROR",
          type: "INJECTION_FAILED",
          message: err.message,
        },
        ...prev,
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTestPayment = async () => {
    if (!activeSession) return;
    setIsRecovering(true);

    try {
      const res = await fetch(`/api/cases/${activeSession.caseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MARK_RESOLVED",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActiveSession((prev) => (prev ? { ...prev, status: "RECOVERED" } : null));
        setResponseLog((prev) => [
          {
            timestamp: new Date().toLocaleTimeString(),
            status: "SUCCESS",
            type: "PAYMENT_CONFIRMED",
            message: `Razorpay webhook confirmed payment capture! ₹${activeSession.amount.toLocaleString("en-IN")} recovered.`,
            caseNumber: activeSession.caseNumber,
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-amber-400" />
            <span>Razorpay Sandbox Simulation Workbench</span>
          </h1>
          <span className="text-[10px] bg-amber-500/10 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/20 font-mono">
            SANDBOX TESTBENCH
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Ingest real payment failure webhooks, inspect AI root-cause diagnosis, dispatch Razorpay Payment Links, and verify server-side revenue recovery.
        </p>
      </div>

      {/* 1-Click Fast Presets */}
      <QuickSimulator
        onInjected={() => {
          setResponseLog((prev) => [
            {
              timestamp: new Date().toLocaleTimeString(),
              status: "SUCCESS",
              type: "PRESET_INJECTED",
              message: "1-Click failure preset processed through VIREON loop.",
            },
            ...prev,
          ]);
        }}
      />

      {/* 3-Step Sandbox Lifecycle Tester */}
      {activeSession && (
        <div className="bg-surface-card rounded-xl p-5 border-2 border-razorpay-500/40 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-razorpay-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-razorpay-500"></span>
              </span>
              <h3 className="font-bold text-white text-sm">
                Active Test Session: <span className="font-mono text-razorpay-400">{activeSession.caseNumber}</span>
              </h3>
            </div>

            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                activeSession.status === "RECOVERED"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {activeSession.status === "RECOVERED" ? "✓ PAYMENT CAPTURED (RECOVERED)" : "⏳ AWAITING TEST PAYMENT"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">1. Failure Ingested</span>
              <p className="text-xs font-bold text-white">{activeSession.customerName}</p>
              <p className="text-xs font-mono text-amber-400 font-bold">{formatINR(activeSession.amount)}</p>
              <p className="text-[10px] text-slate-400 font-mono">Error: {activeSession.errorCode}</p>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">2. Razorpay Link Created</span>
              <p className="text-xs text-slate-300">Generated dynamic payment link</p>
              <a
                href={activeSession.paymentLinkUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-razorpay-400 hover:text-razorpay-300 font-mono underline flex items-center gap-1"
              >
                <span>{activeSession.paymentLinkUrl}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-[10px] text-emerald-400 font-mono block">Channels: WhatsApp + Email</span>
            </div>

            {/* Step 3: Action Button */}
            <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">3. Complete Test Payment</span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Simulate customer completing checkout on Razorpay
                </p>
              </div>

              {activeSession.status === "AWAITING_PAYMENT" ? (
                <button
                  onClick={handleCompleteTestPayment}
                  disabled={isRecovering}
                  className="mt-3 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-lg shadow-emerald-900/30"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isRecovering ? "Capturing via Razorpay..." : "Complete Test Payment"}</span>
                </button>
              ) : (
                <div className="mt-3 flex items-center justify-center gap-1 text-emerald-400 text-xs font-bold py-2 bg-emerald-500/10 rounded border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Revenue Confirmed & Recovered</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generator & Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Custom Failure Form */}
        <div className="glass-card rounded-xl p-6 border border-surface-border space-y-4">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-razorpay-400" />
            <h3 className="font-bold text-white text-sm">Custom Failure Scenario Generator</h3>
          </div>

          <form onSubmit={handleCustomInject} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Customer / Contact Name
                </label>
                <input
                  type="text"
                  required
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-razorpay-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Company / Organization
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-razorpay-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-razorpay-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Phone (WhatsApp)
                </label>
                <input
                  type="text"
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-razorpay-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Amount (₹ INR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-razorpay-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-razorpay-500"
                >
                  <option value="nach">NACH / e-Mandate</option>
                  <option value="upi">UPI AutoPay</option>
                  <option value="card">Card Recurring</option>
                  <option value="netbanking">Netbanking</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Razorpay Error Code
                </label>
                <select
                  value={form.errorCode}
                  onChange={(e) => setForm({ ...form, errorCode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-razorpay-500"
                >
                  <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS</option>
                  <option value="PAYMENT_AUTHENTICATION_FAILED">PAYMENT_AUTH_FAILED</option>
                  <option value="UPI_COLLECT_TIMEOUT">UPI_COLLECT_TIMEOUT</option>
                  <option value="CARD_EXPIRED">CARD_EXPIRED</option>
                  <option value="GATEWAY_ERROR">GATEWAY_ERROR</option>
                  <option value="MANDATE_EXECUTION_FAILED">MANDATE_FAILED</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-razorpay-600 to-indigo-600 hover:from-razorpay-500 hover:to-indigo-500 text-white text-xs font-semibold py-2.5 rounded-lg shadow-glow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing through VIREON Engine...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Inject Failure & Launch Recovery Loop</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Terminal Telemetry Console */}
        <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 flex flex-col font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Terminal className="w-4 h-4 text-razorpay-400" />
              <span className="text-[11px] font-bold text-white">Live Sandbox Telemetry Stream</span>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
              LISTENING
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[360px] pr-1">
            {responseLog.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-center text-xs">
                <Sparkles className="w-6 h-6 mb-2 text-slate-600" />
                <p>No simulated events yet.</p>
                <p className="text-[11px] text-slate-600">Inject a failure above to observe real-time agent output.</p>
              </div>
            ) : (
              responseLog.map((log, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80 text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="text-razorpay-400 font-bold">[{log.timestamp}]</span>
                    <span
                      className={
                        log.type === "PAYMENT_CONFIRMED"
                          ? "text-emerald-400 font-bold"
                          : "text-amber-400 font-bold"
                      }
                    >
                      {log.type}
                    </span>
                  </div>
                  <p className="text-slate-200">{log.message}</p>
                  {log.caseNumber && (
                    <p className="text-[10px] text-slate-400">Case Ref: {log.caseNumber}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
