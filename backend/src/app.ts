import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import apiRoutes from "./routes";

export const app = express();

// Security and CORS
app.use(
  cors({
    origin: "*",
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
