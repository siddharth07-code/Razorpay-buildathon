import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an amount in Indian Rupees (INR) with proper comma separators.
 * Example: 125000 -> ₹1,25,000
 */
export function formatINR(amount: number, includeDecimals = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "₹0";
  }

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: includeDecimals ? 2 : 0,
    minimumFractionDigits: includeDecimals ? 2 : 0,
  });

  return formatter.format(amount);
}

/**
 * Convert Razorpay paise to whole INR
 */
export function paiseToRupees(paise: number): number {
  return Math.round(paise / 100);
}

/**
 * Convert whole INR to Razorpay paise
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Format ISO date string into readable Indian standard format (e.g., 27 Aug 2026, 04:30 PM)
 */
export function formatDateTime(dateStr: string | Date): string {
  if (!dateStr) return "—";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Format relative time (e.g. 5m ago, 2h ago, Yesterday)
 */
export function formatRelativeTime(dateStr: string | Date): string {
  if (!dateStr) return "—";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return "yesterday";
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}
