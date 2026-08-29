import { PrismaClient } from "@prisma/client";
import { config } from "./index";

declare global {
  // eslint-disable-next-line no-var
  var prismaInstance: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaInstance ||
  new PrismaClient({
    log: config.isDev ? ["error", "warn"] : ["error"],
  });

globalThis.prismaInstance = prisma;

/**
 * Safe connection probe to verify Supabase PostgreSQL availability
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    // Perform simple query to verify connection
    await prisma.$queryRaw`SELECT 1 as connected`;
    return {
      connected: true,
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: error?.message || "Failed to reach PostgreSQL database",
    };
  }
}
