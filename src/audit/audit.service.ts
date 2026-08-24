import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    oldValue?: unknown;
    newValue?: unknown;
  }) {
    if (!data.userId) return;
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          oldValue: data.oldValue as any,
          newValue: data.newValue as any,
        },
      });
    } catch {
      // Auditoria nunca deve derrubar a ação principal.
    }
  }

  async findAll() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
