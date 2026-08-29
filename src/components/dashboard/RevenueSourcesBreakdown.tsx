"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatINR } from "@/lib/utils";

export interface SourceMetric {
  source: string;
  amountAtRisk: number;
  recoveredAmount: number;
  recoveryRate: number;
  activeCasesCount: number;
}

export function RevenueSourcesBreakdown({
  sources = [],
  totalRecovered = 56700000,
}: {
  sources?: SourceMetric[];
  totalRecovered?: number;
}) {
  const items = [
    { name: "Payment Recovery", color: "#3B82F6", amount: 92500, percentage: 42 },
    { name: "Subscription Recovery", color: "#8B5CF6", amount: 21498, percentage: 24 },
    { name: "Checkout Abandonment", color: "#22D3EE", amount: 1249, percentage: 10 },
    { name: "B2B Receivables", color: "#10B981", amount: 1265000, percentage: 24 },
  ];

  // SVG Donut calculations
  const size = 130;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const segments = items.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += (item.percentage / 100) * circumference;
    return { ...item, strokeDasharray, strokeDashoffset };
  });

  return (
    <div className="bg-[#080D15] border border-[#151E2E] rounded-2xl p-5 space-y-4 shadow-sm h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
          RECOVERY BY SOURCE
        </h3>
      </div>

      {/* Chart & Legend Section */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* Donut Chart with Center Text */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {segments.map((seg) => (
              <circle
                key={seg.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            ))}
          </svg>

          {/* Center Text */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-white font-mono">
              {formatINR(totalRecovered)}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">
              Recovered
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="space-y-2 w-full max-w-[200px]">
          {items.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex flex-col">
                  <span className="text-slate-300 truncate text-[11px] font-medium">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatINR(item.amount)}
                  </span>
                </div>
              </div>

              <span className="font-mono text-[11px] text-slate-400 font-medium">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Link */}
      <div className="pt-2 border-t border-[#151E2E]/80 flex justify-end">
        <Link
          href="/analytics"
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-400 font-medium transition"
        >
          <span>View Analytics</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
