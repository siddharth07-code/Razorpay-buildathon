"use client";

import React, { useEffect, useState } from "react";
import { RecoveryCasesTable } from "@/components/dashboard/RecoveryCasesTable";
import { RecoveryCase } from "@/types";
import { ShieldAlert, RefreshCw } from "lucide-react";

export default function CasesPage() {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetch("/api/cases");
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-razorpay-400" />
            <span>Recovery Case Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track, inspect, and trigger interventions on failed Razorpay subscriptions and payments.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs px-3 py-2 rounded-lg border border-slate-800 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <RecoveryCasesTable cases={cases} onCaseUpdated={loadData} />
    </div>
  );
}
