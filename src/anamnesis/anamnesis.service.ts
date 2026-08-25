import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AnamnesisService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

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

  async remove(id: string, actorUserId?: string) {
    const atual = await this.prisma.anamnesis.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException('Registro de anamnese não encontrado.');

    await this.prisma.anamnesis.delete({ where: { id } });

    if (actorUserId) {
      await this.audit.log({
        userId: actorUserId,
        action: 'delete',
        resource: 'anamnesis',
        resourceId: id,
        oldValue: atual,
      });
    }

    return { excluido: true };
  }
}
