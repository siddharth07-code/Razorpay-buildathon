import { Request, Response } from "express";
import { analyticsService } from "../services/analytics.service";
import { serializeBigInt } from "../utils/money";

export async function getAnalyticsOverview(req: Request, res: Response) {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const data = await analyticsService.getOverview(days);
    res.json(serializeBigInt(data));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch analytics overview" });
  }
}

export async function getRevenueTrend(req: Request, res: Response) {
  try {
    const period = (req.query.period as any) || "7d";
    const data = await analyticsService.getRevenueTrend(period);
    res.json(serializeBigInt(data));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch revenue trend" });
  }
}

export async function getRecoveryFunnel(req: Request, res: Response) {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const data = await analyticsService.getFunnel(days);
    res.json(serializeBigInt(data));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch recovery funnel" });
  }
}

export async function getInterventions(req: Request, res: Response) {
  try {
    const data = await analyticsService.getInterventionPerformance();
    res.json(serializeBigInt(data));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch interventions performance" });
  }
}

export async function getRootCauses(req: Request, res: Response) {
  try {
    const data = await analyticsService.getRootCauseAnalytics();
    res.json(serializeBigInt(data));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch root cause analytics" });
  }
}

export async function getCustomerSegments(req: Request, res: Response) {
  try {
    const data = await analyticsService.getCustomerSegmentAnalytics();
    res.json(serializeBigInt(data));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch customer segment analytics" });
  }
}

export async function getAgentPerformance(req: Request, res: Response) {
  try {
    const data = await analyticsService.getAgentPerformance();
    res.json(serializeBigInt(data));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch agent performance" });
  }
}

export async function getRecoveryROI(req: Request, res: Response) {
  try {
    const data = await analyticsService.getRecoveryROI();
    res.json(serializeBigInt(data));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch recovery ROI" });
  }
}

export async function getScorecard(req: Request, res: Response) {
  try {
    const data = await analyticsService.getScorecard();
    res.json(serializeBigInt(data));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch recovery scorecard" });
  }
}
