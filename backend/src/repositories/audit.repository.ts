import { prisma } from "../config/prisma";

export class AuditRepository {
  public async logEvent(data: {
    caseId?: string;
    actor: string;
    eventType: string;
    description?: string;
    metadata?: any;
  }) {
    return prisma.auditEvent.create({
      data: {
        caseId: data.caseId,
        actor: data.actor,
        eventType: data.eventType,
        description: data.description,
        metadata: data.metadata || {},
      },
    });
  }

  public async listEvents(params?: { caseId?: string; eventType?: string; limit?: number; offset?: number }) {
    const { caseId, eventType, limit = 50, offset = 0 } = params || {};
    const where: any = {};
    if (caseId) where.caseId = caseId;
    if (eventType) where.eventType = eventType;

    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { timestamp: "desc" },
        include: { recoveryCase: true },
      }),
      prisma.auditEvent.count({ where }),
    ]);

    return { events, total };
  }
}

export const auditRepository = new AuditRepository();
