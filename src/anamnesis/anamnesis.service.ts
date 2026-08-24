import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnamnesisService {
  constructor(private prisma: PrismaService) {}

  async create(data: { patientId: string; answers: Record<string, unknown>; filledBy: string }) {
    const last = await this.prisma.anamnesis.findFirst({
      where: { patientId: data.patientId },
      orderBy: { version: 'desc' },
    });

    return this.prisma.anamnesis.create({
      data: {
        patientId: data.patientId,
        answers: data.answers as any,
        filledBy: data.filledBy,
        version: (last?.version ?? 0) + 1,
      },
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.anamnesis.findMany({
      where: { patientId },
      orderBy: { version: 'desc' },
    });
  }
}
