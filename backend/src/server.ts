import { app } from "./app";
import { config } from "./config";
import { checkDatabaseConnection } from "./config/prisma";

const PORT = config.port || 5001;

async function startServer() {
  console.log(`[RecoverAI] Initializing Express backend on port ${PORT}...`);

  // Check database connection
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.connected) {
    console.log(`[Database] ✓ Connected to PostgreSQL database (${dbStatus.latencyMs}ms latency)`);
  } else {
    console.warn(`[Database] ⚠ PostgreSQL probe: ${dbStatus.error || "Awaiting credentials"}`);
    console.log(`[Database] Running in zero-downtime mock fallback provider.`);
  }

  const server = app.listen(PORT, () => {
    console.log(`[RecoverAI Server] ✓ Running at http://localhost:${PORT}`);
    console.log(`[RecoverAI API] Health check: http://localhost:${PORT}/api/health`);
    console.log(`[RecoverAI API] Dashboard summary: http://localhost:${PORT}/api/dashboard/summary`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("[RecoverAI Server] SIGTERM received. Gracefully closing...");
    server.close(() => process.exit(0));
  });

  process.on("SIGINT", () => {
    console.log("[RecoverAI Server] SIGINT received. Shutting down...");
    server.close(() => process.exit(0));
  });
}

startServer().catch((err) => {
  console.error("[Fatal Startup Error]:", err);
  process.exit(1);
});
