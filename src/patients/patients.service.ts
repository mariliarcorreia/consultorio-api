import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type PatientFields = {
  fullName?: string;
  socialName?: string;
  birthDate?: string;
  cpf?: string;
  rg?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  guardianName?: string;
  guardianCpf?: string;
  guardianPhone?: string;
  status?: string;
};

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(
    data: PatientFields & { clinicId: string; fullName: string; birthDate: string; actorUserId?: string },
  ) {
    const patient = await this.prisma.patient.create({
      data: {
        clinicId: data.clinicId,
        fullName: data.fullName,
        socialName: data.socialName,
        birthDate: new Date(data.birthDate),
        cpf: data.cpf,
        rg: data.rg,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        guardianName: data.guardianName,
        guardianCpf: data.guardianCpf,
        guardianPhone: data.guardianPhone,
      },
    });

    if (data.actorUserId) {
      await this.auditService.log({
        userId: data.actorUserId,
        action: 'create',
        resource: 'patient',
        resourceId: patient.id,
        newValue: { fullName: patient.fullName },
      });
    }

    return patient;
  }

  async findAll(clinicId: string) {
    return this.prisma.patient.findMany({
      where: { clinicId, deletedAt: null },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.patient.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: PatientFields & { actorUserId?: string }) {
    const { actorUserId, ...fields } = data;

    const patient = await this.prisma.patient.update({
      where: { id },
      data: {
        ...(fields.fullName !== undefined && { fullName: fields.fullName }),
        ...(fields.socialName !== undefined && { socialName: fields.socialName }),
        ...(fields.birthDate !== undefined && { birthDate: new Date(fields.birthDate) }),
        ...(fields.cpf !== undefined && { cpf: fields.cpf }),
        ...(fields.rg !== undefined && { rg: fields.rg }),
        ...(fields.phone !== undefined && { phone: fields.phone }),
        ...(fields.whatsapp !== undefined && { whatsapp: fields.whatsapp }),
        ...(fields.email !== undefined && { email: fields.email }),
        ...(fields.address !== undefined && { address: fields.address }),
        ...(fields.city !== undefined && { city: fields.city }),
        ...(fields.state !== undefined && { state: fields.state }),
        ...(fields.zipCode !== undefined && { zipCode: fields.zipCode }),
        ...(fields.guardianName !== undefined && { guardianName: fields.guardianName }),
        ...(fields.guardianCpf !== undefined && { guardianCpf: fields.guardianCpf }),
        ...(fields.guardianPhone !== undefined && { guardianPhone: fields.guardianPhone }),
        ...(fields.status !== undefined && { status: fields.status }),
      },
    });

    if (actorUserId) {
      await this.auditService.log({
        userId: actorUserId,
        action: 'update',
        resource: 'patient',
        resourceId: patient.id,
        newValue: fields,
      });
    }

    return patient;
  }

  async remove(id: string, actorUserId?: string) {
    const patient = await this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    if (actorUserId) {
      await this.auditService.log({
        userId: actorUserId,
        action: 'delete',
        resource: 'patient',
        resourceId: patient.id,
      });
    }

    return patient;
  }
}
