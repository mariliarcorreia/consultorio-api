import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { dentroDoHorarioFuncionamento, normalizarHorarios } from './working-hours.util';

const STATUS_VALIDOS = ['agendado', 'confirmado', 'concluido', 'cancelado', 'faltou'];

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(clinicId: string, start?: string, end?: string) {
    return this.prisma.appointment.findMany({
      where: {
        clinicId,
        ...(start && end
          ? {
              startsAt: { lt: new Date(end) },
              endsAt: { gt: new Date(start) },
            }
          : {}),
      },
      include: { patient: { select: { id: true, fullName: true, phone: true } } },
      orderBy: { startsAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const agendamento = await this.prisma.appointment.findUnique({
      where: { id },
      include: { patient: { select: { id: true, fullName: true, phone: true } } },
    });
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
    return agendamento;
  }

  private async validarDisponibilidade(
    clinicId: string,
    startsAt: Date,
    endsAt: Date,
    ignorarId?: string,
  ) {
    if (endsAt <= startsAt) {
      throw new BadRequestException('O horário de término precisa ser depois do início.');
    }

    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
    const horarios = normalizarHorarios(clinic?.workingHours);
    const dentroHorario = dentroDoHorarioFuncionamento(horarios, startsAt, endsAt);
    if (!dentroHorario.ok) {
      throw new BadRequestException(dentroHorario.motivo);
    }

    const bloqueios = await this.prisma.scheduleBlock.findMany({
      where: {
        clinicId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (bloqueios.length > 0) {
      throw new BadRequestException(
        `Esse horário está bloqueado${bloqueios[0].reason ? ` (${bloqueios[0].reason})` : ''}.`,
      );
    }

    const conflitos = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        status: { not: 'cancelado' },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        ...(ignorarId && { id: { not: ignorarId } }),
      },
      include: { patient: { select: { fullName: true } } },
    });
    if (conflitos.length > 0) {
      throw new BadRequestException(
        `Já existe um agendamento nesse horário (${conflitos[0].patient.fullName}).`,
      );
    }
  }

  async create(data: {
    clinicId: string;
    patientId: string;
    type?: string;
    startsAt: string;
    endsAt: string;
    notes?: string;
    createdBy: string;
  }) {
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    await this.validarDisponibilidade(data.clinicId, startsAt, endsAt);

    const agendamento = await this.prisma.appointment.create({
      data: {
        clinicId: data.clinicId,
        patientId: data.patientId,
        type: data.type || 'consulta',
        startsAt,
        endsAt,
        notes: data.notes,
        createdBy: data.createdBy,
      },
      include: { patient: { select: { id: true, fullName: true, phone: true } } },
    });

    await this.audit.log({
      userId: data.createdBy,
      action: 'create',
      resource: 'appointment',
      resourceId: agendamento.id,
      newValue: agendamento,
    });

    return agendamento;
  }

  async update(
    id: string,
    data: {
      startsAt?: string;
      endsAt?: string;
      type?: string;
      status?: string;
      notes?: string;
      actorUserId?: string;
    },
  ) {
    const atual = await this.findOne(id);

    if (data.status && !STATUS_VALIDOS.includes(data.status)) {
      throw new BadRequestException('Status inválido.');
    }

    const novoInicio = data.startsAt ? new Date(data.startsAt) : atual.startsAt;
    const novoFim = data.endsAt ? new Date(data.endsAt) : atual.endsAt;

    if (data.startsAt || data.endsAt) {
      await this.validarDisponibilidade(atual.clinicId, novoInicio, novoFim, id);
    }

    const atualizado = await this.prisma.appointment.update({
      where: { id },
      data: {
        ...(data.startsAt && { startsAt: novoInicio }),
        ...(data.endsAt && { endsAt: novoFim }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: { patient: { select: { id: true, fullName: true, phone: true } } },
    });

    await this.audit.log({
      userId: data.actorUserId || atual.createdBy,
      action: 'update',
      resource: 'appointment',
      resourceId: id,
      oldValue: atual,
      newValue: atualizado,
    });

    return atualizado;
  }

  async remove(id: string, actorUserId?: string) {
    const atual = await this.findOne(id);
    await this.prisma.appointment.delete({ where: { id } });

    await this.audit.log({
      userId: actorUserId || atual.createdBy,
      action: 'delete',
      resource: 'appointment',
      resourceId: id,
      oldValue: atual,
    });

    return { excluido: true };
  }
}
