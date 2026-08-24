import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TreatmentPlansService {
  constructor(private prisma: PrismaService) {}

  async findByPatient(patientId: string) {
    return this.prisma.treatmentPlan.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async create(data: { patientId: string; validUntil?: string }) {
    return this.prisma.treatmentPlan.create({
      data: {
        patientId: data.patientId,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      },
      include: { items: true },
    });
  }

  async update(id: string, data: { status?: string; validUntil?: string }) {
    return this.prisma.treatmentPlan.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.validUntil !== undefined && { validUntil: new Date(data.validUntil) }),
        ...(data.status === 'accepted' && { acceptedAt: new Date() }),
      },
      include: { items: true },
    });
  }

  async addItem(
    treatmentPlanId: string,
    data: {
      procedure: string;
      region?: string;
      quantity?: number;
      price: number;
      discount?: number;
      priority?: number;
    },
  ) {
    const quantity = data.quantity ?? 1;
    const price = data.price;
    const discount = data.discount ?? 0;
    const finalPrice = quantity * price - discount;

    await this.prisma.treatmentPlanItem.create({
      data: {
        treatmentPlanId,
        procedure: data.procedure,
        region: data.region,
        quantity,
        price,
        discount,
        finalPrice,
        priority: data.priority ?? 0,
      },
    });

    return this.prisma.treatmentPlan.findUnique({
      where: { id: treatmentPlanId },
      include: { items: true },
    });
  }
}
