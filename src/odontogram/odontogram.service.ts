import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OdontogramService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // Retorna todo o histórico do paciente (mais recente primeiro). A "situação atual"
  // de cada dente é calculada no frontend a partir do registro mais recente por dente,
  // mantendo o histórico completo sempre preservado aqui.
  async findByPatient(patientId: string) {
    return this.prisma.odontogramEntry.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Cada chamada cria um novo registro. Nunca sobrescreve nem apaga o anterior:
  // é assim que o histórico por dente e o histórico geral são preservados.
  async create(data: {
    patientId: string;
    toothNumber: number;
    surfaces?: string[];
    condition: string;
    status: string;
    observation?: string;
    professionalId: string;
  }) {
    return this.prisma.odontogramEntry.create({
      data: {
        patientId: data.patientId,
        toothNumber: data.toothNumber,
        surfaces: data.surfaces ?? [],
        condition: data.condition,
        status: data.status,
        observation: data.observation,
        professionalId: data.professionalId,
      },
    });
  }

  async remove(id: string, actorUserId?: string) {
    const atual = await this.prisma.odontogramEntry.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException('Registro do odontograma não encontrado.');

    await this.prisma.odontogramEntry.delete({ where: { id } });

    if (actorUserId) {
      await this.audit.log({
        userId: actorUserId,
        action: 'delete',
        resource: 'odontogram_entry',
        resourceId: id,
        oldValue: atual,
      });
    }

    return { excluido: true };
  }

  // Usa o plano de tratamento mais recente do paciente (ou cria um novo, se ainda
  // não existir nenhum) e adiciona o procedimento sugerido como um item nele,
  // já identificando o dente e as faces envolvidas na região do item.
  async adicionarAoPlano(entryId: string, data: { procedure: string; price?: number; actorUserId?: string }) {
    const entrada = await this.prisma.odontogramEntry.findUnique({ where: { id: entryId } });
    if (!entrada) throw new NotFoundException('Registro do odontograma não encontrado.');

    let plano = await this.prisma.treatmentPlan.findFirst({
      where: { patientId: entrada.patientId },
      orderBy: { createdAt: 'desc' },
    });

    if (!plano) {
      plano = await this.prisma.treatmentPlan.create({
        data: { patientId: entrada.patientId },
      });
    }

    const region = `Dente ${entrada.toothNumber}${
      entrada.surfaces.length > 0 ? ` - ${entrada.surfaces.join(', ')}` : ''
    }`;
    const price = data.price ?? 0;

    const item = await this.prisma.treatmentPlanItem.create({
      data: {
        treatmentPlanId: plano.id,
        procedure: data.procedure,
        region,
        quantity: 1,
        price,
        discount: 0,
        finalPrice: price,
        priority: 0,
      },
    });

    if (data.actorUserId) {
      await this.audit.log({
        userId: data.actorUserId,
        action: 'create',
        resource: 'treatment_plan_item',
        resourceId: item.id,
        newValue: item,
      });
    }

    return { treatmentPlanId: plano.id, item };
  }
}
