import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { camposPersonalizados } from './placeholders.util';

@Injectable()
export class DocumentTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(clinicId: string, code?: string, includeInactive = false) {
    return this.prisma.documentTemplate.findMany({
      where: {
        clinicId,
        ...(includeInactive ? {} : { active: true }),
        ...(code && { code }),
      },
      orderBy: { title: 'asc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Modelo não encontrado.');
    return template;
  }

  async camposPersonalizados(id: string) {
    const template = await this.findOne(id);
    return { campos: camposPersonalizados(template.content) };
  }

  async create(data: { clinicId: string; code: string; title: string; content: string }) {
    return this.prisma.documentTemplate.create({ data });
  }

  async update(id: string, data: { title?: string; content?: string; active?: boolean }) {
    return this.prisma.documentTemplate.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const emUso = await this.prisma.generatedDocument.count({ where: { templateId: id } });

    if (emUso > 0) {
      // Não dá pra apagar de verdade: existem documentos gerados a partir desse modelo.
      // Desativa em vez de excluir, pra não quebrar o histórico desses documentos.
      await this.prisma.documentTemplate.update({ where: { id }, data: { active: false } });
      return { excluido: false, desativado: true };
    }

    await this.prisma.documentTemplate.delete({ where: { id } });
    return { excluido: true, desativado: false };
  }
}
