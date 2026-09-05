import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import apiRoutes from "./routes";

export const app = express();

// Security and CORS
const rawAllowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5001",
].filter(Boolean) as string[];

const allowedOrigins = rawAllowedOrigins.flatMap((o) =>
  o.includes(",") ? o.split(",").map((s) => s.trim()) : [o.trim()]
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server, curl, webhooks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.length === 0) {
        return callback(null, true);
      }
      if (allowedOrigins.some((allowed) => origin === allowed || origin.startsWith(allowed))) {
        return callback(null, true);
      }
      // Demo safety: reflect origin to prevent hackathon presentation breakage across subdomains
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-razorpay-signature"],
  })
);

// Preserving raw body for webhook HMAC signature verification
app.use(
  express.json({
    verify: (req: any, _res: any, buf: Buffer) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

app.use(express.urlencoded({ extended: true }));

// Request Logger (Never logs secrets)
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (!req.path.includes("/health")) {
      console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use("/api", apiRoutes);

// Root Health Fallback
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "VIREON Backend Engine",
    status: "online",
    documentation: "/api/health",
  });
});

// Centralized Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[Unhandled Error]:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    status: err.status || 500,
  });
});
