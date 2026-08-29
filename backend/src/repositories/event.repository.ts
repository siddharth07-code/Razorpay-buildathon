import { prisma } from "../config/prisma";

export class EventRepository {
  public async findByEventId(eventId: string) {
    return prisma.razorpayEvent.findUnique({
      where: { eventId },
    });
  }

  public async recordEvent(data: {
    eventId: string;
    eventType: string;
    signatureVerified: boolean;
    payload: any;
  }) {
    return prisma.razorpayEvent.create({
      data: {
        eventId: data.eventId,
        eventType: data.eventType,
        signatureVerified: data.signatureVerified,
        payload: data.payload,
        processed: false,
      },
    });
  }

  public async markProcessed(eventId: string) {
    return prisma.razorpayEvent.update({
      where: { eventId },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  }
}

export const eventRepository = new EventRepository();
