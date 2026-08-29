"use client";

import React, { useState } from "react";
import { SlidersHorizontal, Zap, CheckCircle2, Play } from "lucide-react";
import { formatINR } from "@/lib/utils";

export function QuickSimulator({ onInjected }: { onInjected?: () => void }) {
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const presets = [
    {
      id: "nach_insufficient",
      title: "HDFC NACH Balance Dip",
      amount: 149999,
      method: "nach" as const,
      errorCode: "INSUFFICIENT_FUNDS" as const,
      customerName: "Zenith Edutech Pvt Ltd",
      email: "finance@zenithedutech.in",
      phone: "+919876543210",
      company: "Zenith Edutech",
      description: "Trigger morning clearing balance rejection",
    },
    {
      id: "card_3ds_drop",
      title: "3DS 2.0 OTP Abandonment",
      amount: 24999,
      method: "card" as const,
      errorCode: "PAYMENT_AUTHENTICATION_FAILED" as const,
      customerName: "HyperLocal Logistics",
      email: "billing@hyperlocal.co",
      phone: "+919811223344",
      company: "HyperLocal Deliveries",
      description: "Trigger checkout auth dropout on ICICI Card",
    },
    {
      id: "upi_timeout",
      title: "UPI Collect Push Expiry",
      amount: 4999,
      method: "upi" as const,
      errorCode: "UPI_COLLECT_TIMEOUT" as const,
      customerName: "ChaiCrafters Gourmet",
      email: "rohit@chaicrafters.in",
      phone: "+919123456789",
      company: "ChaiCrafters D2C",
      description: "Simulate 5-minute timeout on PhonePe / GPay",
    },
    {
      id: "card_expired",
      title: "Expired Corporate Card",
      amount: 89000,
      method: "card" as const,
      errorCode: "CARD_EXPIRED" as const,
      customerName: "LogiTrack Systems",
      email: "billing@logitrack.io",
      phone: "+919744112233",
      company: "LogiTrack India",
      description: "Simulate expired token requiring fresh KYC/card",
    },
  ];

  const handleRunPreset = async (p: typeof presets[0]) => {
    setLoadingPreset(p.id);
    setNotification(null);

    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "INJECT_FAILURE",
          customerName: p.customerName,
          customerEmail: p.email,
          customerPhone: p.phone,
          companyName: p.company,
          amount: p.amount,
          method: p.method,
          errorCode: p.errorCode,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setNotification(`Injected ${p.title} (${formatINR(p.amount)})! Case ${data.caseNumber} generated.`);
        if (onInjected) onInjected();
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPreset(null);
    }
  };

  return (
    <div className="glass-card rounded-xl border border-surface-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              1-Click Razorpay Failure Simulator
            </h3>
            <p className="text-[11px] text-slate-400">
              Test autonomous agent reactions under realistic Indian failure modes
            </p>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {presets.map((p) => (
          <button
            key={p.id}
            disabled={Boolean(loadingPreset)}
            onClick={() => handleRunPreset(p)}
            className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-800/80 text-left transition space-y-2 group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-400">
                {formatINR(p.amount)}
              </span>
              <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {p.method}
              </span>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white group-hover:text-amber-300 transition">
                {p.title}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight line-clamp-2">
                {p.description}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-razorpay-400 font-medium pt-1">
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>{loadingPreset === p.id ? "Simulating..." : "Inject Failure"}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
