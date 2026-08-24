import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduleBlocksService {
  constructor(private prisma: PrismaService) {}

  async findAll(clinicId: string, start?: string, end?: string) {
    return this.prisma.scheduleBlock.findMany({
      where: {
        clinicId,
        ...(start && end
          ? {
              startsAt: { lt: new Date(end) },
              endsAt: { gt: new Date(start) },
            }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async create(data: { clinicId: string; startsAt: string; endsAt: string; reason?: string }) {
    return this.prisma.scheduleBlock.create({
      data: {
        clinicId: data.clinicId,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        reason: data.reason,
      },
    });
  }

  async remove(id: string) {
    const bloqueio = await this.prisma.scheduleBlock.findUnique({ where: { id } });
    if (!bloqueio) throw new NotFoundException('Bloqueio não encontrado.');
    await this.prisma.scheduleBlock.delete({ where: { id } });
    return { excluido: true };
  }
}
