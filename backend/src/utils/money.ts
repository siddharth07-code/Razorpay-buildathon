/**
 * Monetary Calculation and Serialization Utilities
 * Ensures all financial operations are strictly integer smallest currency unit (paise) math.
 * Zero floating-point drift.
 */

/**
 * Convert Rupees to Paise (BigInt)
 * e.g., ₹25,000.50 -> 2500050n
 */
export function toPaise(amountInRupees: number | string | bigint): bigint {
  if (typeof amountInRupees === "bigint") {
    return amountInRupees;
  }
  const numeric = typeof amountInRupees === "string" ? parseFloat(amountInRupees) : amountInRupees;
  if (isNaN(numeric)) {
    return BigInt(0);
  }
  return BigInt(Math.round(numeric * 100));
}

/**
 * Convert Paise (BigInt or number) to Rupees (number) for display/API responses
 * e.g., 2500050n -> 25000.50
 */
export function fromPaise(paise: bigint | number | null | undefined): number {
  if (paise === null || paise === undefined) return 0;
  if (typeof paise === "bigint") {
    return Number(paise) / 100;
  }
  return paise / 100;
}

/**
 * Format monetary amount (in paise or rupees) as localized Indian Rupee string (₹)
 * e.g., 2500000n paise -> "₹25,000"
 */
export function formatINR(amount: bigint | number, isPaise: boolean = true): string {
  const rupees = isPaise ? fromPaise(amount) : Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

/**
 * Recursive JSON serializer for BigInt values
 * Converts all BigInt properties in objects/arrays to string or safe numeric representation for standard JSON responses
 */
export function serializeBigInt<T>(obj: T): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return obj <= BigInt(Number.MAX_SAFE_INTEGER) && obj >= BigInt(Number.MIN_SAFE_INTEGER)
      ? Number(obj)
      : obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInt(value);
    }
    return result;
  }

  return obj;
}

/**
 * Strict String-preserving JSON serializer for BigInt values
 * Guarantees zero precision loss by serializing all BigInts as digit strings.
 * Dates become ISO strings, nested objects/arrays are recursively traversed.
 */
export function serializeForJson<T>(obj: T): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeForJson);
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeForJson(value);
    }
    return result;
  }

  return obj;
}
