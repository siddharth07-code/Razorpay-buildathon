import { Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service";
import { serializeBigInt } from "../utils/money";

export async function getDashboardSummary(req: Request, res: Response) {
  try {
    const summary = await dashboardService.getSummaryMetrics();
    res.json(serializeBigInt(summary));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch dashboard metrics" });
  }
}

export async function getDashboardRecovery(req: Request, res: Response) {
  try {
    const summary = await dashboardService.getSummaryMetrics();
    res.json(
      serializeBigInt({
        totalRevenueRecovered: summary.totalRevenueRecovered,
        autonomousRecoveryRate: summary.autonomousRecoveryRate,
        funnel: summary.funnel,
      })
    );
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch recovery metrics" });
  }
}

export async function getDashboardTrends(req: Request, res: Response) {
  try {
    const summary = await dashboardService.getSummaryMetrics();
    res.json(serializeBigInt({ trends: summary.trendHistory }));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch trend history" });
  }
}
