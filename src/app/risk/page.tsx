"use client";

import React, { useEffect, useState } from "react";
import { RevenueRisk } from "@/types";
import { formatINR, formatDateTime } from "@/lib/utils";
import { TrendingDown, AlertTriangle, ShieldAlert, ArrowUpRight, Sparkles, Activity } from "lucide-react";

export default function RevenueRiskPage() {
  const [risks, setRisks] = useState<RevenueRisk[]>([
    {
      id: "risk_001",
      customerId: "cust_zenith_01",
      customerName: "Zenith Edutech Pvt Ltd",
      customerTier: "ENTERPRISE",
      riskScore: 78,
      churnProbability: 0.35,
      revenueAtRisk: 149999,
      riskTier: "CRITICAL",
      keyRiskFactors: [
        "First-time mandate failure on annual contract",
        "High contract value (₹1,49,999)",
        "End of month liquidity timing",
      ],
      recommendedAction: "Execute afternoon smart auto-retry + high-touch CSM fallback if unrecovered by Day 2",
      lastPaymentHealth: "DEGRADED",
      healthTrend: "STABLE",
      dunningSequenceName: "Enterprise Tier 1 Smart Dunning",
      consecutiveFailures: 1,
      lastFailureDate: new Date().toISOString(),
      suggestedGracePeriodDays: 5,
      createdAt: new Date().toISOString(),
    },
    {
      id: "risk_002",
      customerId: "cust_hyperlocal_02",
      customerName: "HyperLocal Logistics India",
      customerTier: "GROWTH",
      riskScore: 84,
      churnProbability: 0.42,
      revenueAtRisk: 24999,
      riskTier: "HIGH",
      keyRiskFactors: [
        "2 consecutive authentication drop-offs",
        "Decreasing login activity on merchant portal",
      ],
      recommendedAction: "Dispatch WhatsApp interactive Razorpay link with 1-click UPI Autopay migration",
      lastPaymentHealth: "CRITICAL",
      healthTrend: "DETERIORATING",
      dunningSequenceName: "Growth Interactive WhatsApp Flow",
      consecutiveFailures: 2,
      lastFailureDate: new Date().toISOString(),
      suggestedGracePeriodDays: 3,
      createdAt: new Date().toISOString(),
    },
    {
      id: "risk_003",
      customerId: "cust_logitrack_04",
      customerName: "LogiTrack Systems India",
      customerTier: "ENTERPRISE",
      riskScore: 72,
      churnProbability: 0.28,
      revenueAtRisk: 79000,
      riskTier: "HIGH",
      keyRiskFactors: [
        "Card expired (07/26)",
        "Mandate token needs re-consent with updated card details",
      ],
      recommendedAction: "Send branded Card Update Razorpay portal link with instant tokenization",
      lastPaymentHealth: "DEGRADED",
      healthTrend: "STABLE",
      dunningSequenceName: "Card Expiry Tokenization Dunning",
      consecutiveFailures: 1,
      lastFailureDate: new Date().toISOString(),
      suggestedGracePeriodDays: 7,
      createdAt: new Date().toISOString(),
    },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <TrendingDown className="w-6 h-6 text-rose-400" />
          <span>Revenue Risk & Churn Intelligence</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Predictive churn risk scoring and automated account intervention workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {risks.map((r) => (
          <div
            key={r.id}
            className="glass-card rounded-xl border border-surface-border p-5 space-y-4 relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {r.customerTier}
                </span>
                <h3 className="text-sm font-bold text-white mt-1.5">{r.customerName}</h3>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase">Risk Score</span>
                <div className="text-xl font-bold font-mono text-rose-400">{r.riskScore}/100</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400">Revenue at Risk</span>
                <p className="font-bold text-white font-mono">{formatINR(r.revenueAtRisk)}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Churn Probability</span>
                <p className="font-bold text-amber-400 font-mono">
                  {Math.round(r.churnProbability * 100)}%
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Key Risk Signals
              </span>
              <ul className="space-y-1 text-xs text-slate-300">
                {r.keyRiskFactors.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-400 text-xs leading-none">•</span>
                    <span className="text-[11px] leading-tight">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-1">
              <div className="flex items-center gap-1 text-razorpay-400 text-[11px] font-semibold">
                <Sparkles className="w-3 h-3" />
                <span>Recommended Action</span>
              </div>
              <p className="text-[11px] text-slate-300 italic leading-snug">
                "{r.recommendedAction}"
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
