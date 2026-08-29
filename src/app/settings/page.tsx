"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Key,
  ShieldCheck,
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Globe,
  Radio,
  ExternalLink,
} from "lucide-react";
import { ConnectionTestResult } from "@/lib/razorpay/types";

export default function SettingsPage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionTestResult | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [saved, setSaved] = useState(false);

  const testRazorpayConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch("/api/razorpay/connection-test", { method: "POST" });
      const data: ConnectionTestResult = await res.json();
      setConnectionStatus(data);
    } catch (err: any) {
      setConnectionStatus({
        connected: false,
        environment: "test",
        mode: "sandbox",
        maskedKeyId: "rzp_test_••••",
        keyId: "",
        message: "Failed to connect to backend connection probe.",
        merchantName: "VIREON Merchant",
        latencyMs: 0,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  useEffect(() => {
    testRazorpayConnection();
  }, []);

  const handleCopyWebhook = () => {
    const webhookUrl = `${window.location.origin}/api/webhooks/razorpay`;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-razorpay-400" />
            <span>Razorpay Integration & Policy Settings</span>
          </h1>
          <span className="text-[10px] bg-amber-500/10 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/20 font-mono">
            SANDBOX ENVIRONMENT
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Manage Razorpay Test credentials, live connection status, cryptographic webhook endpoints, and deterministic recovery policies.
        </p>
      </div>

      {/* Connection Status Banner */}
      <div className="bg-surface-card rounded-xl p-5 border border-surface-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                connectionStatus?.connected
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              {connectionStatus?.connected ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">
                  {connectionStatus?.connected
                    ? "Razorpay Sandbox Connected"
                    : "Razorpay Connection Pending"}
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    connectionStatus?.connected
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {connectionStatus?.mode === "mock" ? "MOCK SANDBOX" : "API TEST MODE"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {connectionStatus?.message || "Probing connection..."}
              </p>
            </div>
          </div>

          <button
            onClick={testRazorpayConnection}
            disabled={testingConnection}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 transition disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? "animate-spin" : ""}`} />
            <span>{testingConnection ? "Testing..." : "Test Connection"}</span>
          </button>
        </div>

        {/* Live Parameters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Provider</span>
            <span className="font-bold text-white font-mono">Official Razorpay SDK</span>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Environment</span>
            <span className="font-bold text-amber-400 font-mono uppercase">
              {connectionStatus?.environment || "TEST"}
            </span>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Key ID (Public)</span>
            <span className="font-bold text-slate-200 font-mono text-[11px]">
              {connectionStatus?.maskedKeyId || "rzp_test_••••••••"}
            </span>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">API Latency</span>
            <span className="font-bold text-emerald-400 font-mono">
              {connectionStatus?.latencyMs ?? 1} ms
            </span>
          </div>
        </div>
      </div>

      {/* Webhook Configuration Card */}
      <div className="bg-surface-card rounded-xl p-6 border border-surface-border space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Globe className="w-5 h-5 text-razorpay-400" />
          <div>
            <h3 className="font-bold text-white text-sm">Server-Side Webhook Configuration</h3>
            <p className="text-xs text-slate-400">
              Deliver real-time Razorpay payment and refund events directly to VIREON
            </p>
          </div>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Webhook Endpoint URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={
                  typeof window !== "undefined"
                    ? `${window.location.origin}/api/webhooks/razorpay`
                    : "https://your-domain.com/api/webhooks/razorpay"
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 transition flex-shrink-0"
              >
                {copiedWebhook ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-xs font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-xs">Copy URL</span>
                  </>
                )}
              </button>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Configure in your Razorpay Dashboard under <strong>Settings &gt; Webhooks</strong>.
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Subscribed Webhook Events</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                "payment.failed",
                "payment.captured",
                "payment.authorized",
                "order.paid",
                "payment_link.paid",
                "payment_link.expired",
                "subscription.charged",
                "subscription.halted",
                "invoice.paid",
              ].map((evt) => (
                <span
                  key={evt}
                  className="font-mono text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800"
                >
                  {evt}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Autonomous Agent Policy Rules */}
      <div className="bg-surface-card rounded-xl p-6 border border-surface-border space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-bold text-white text-sm">Deterministic Policy Engine Rules</h3>
            <p className="text-xs text-slate-400">Hard limits enforced across all AI actions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Human Approval Threshold</span>
            <span className="font-mono text-base font-bold text-white">₹1,00,000 INR</span>
            <p className="text-[10px] text-slate-500">
              Transactions &ge; ₹1,00,000 require human operations review before execution.
            </p>
          </div>

          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Max Payment Retries</span>
            <span className="font-mono text-base font-bold text-white">3 Attempts</span>
            <p className="text-[10px] text-slate-500">
              Protects merchant mandate reputation and prevents RBI/NPCI clearing penalties.
            </p>
          </div>

          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Max Customer Contacts</span>
            <span className="font-mono text-base font-bold text-white">3 Messages</span>
            <p className="text-[10px] text-slate-500">
              Prevents customer dunning fatigue across WhatsApp and Email channels.
            </p>
          </div>

          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Min Retry Interval</span>
            <span className="font-mono text-base font-bold text-white">12 Hours</span>
            <p className="text-[10px] text-slate-500">
              Aligns with peak Indian clearing cycles (morning dawn clearing vs afternoon 2:30 PM).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
