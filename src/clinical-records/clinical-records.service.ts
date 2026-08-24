import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClinicalRecordsService {
  constructor(private prisma: PrismaService) {}

  async findByPatient(patientId: string) {
    return this.prisma.clinicalRecord.findFirst({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { clinicalNotes: { orderBy: { date: 'desc' } } },
    });
  }

  async create(data: {
    patientId: string;
    complaint?: string;
    evaluation?: string;
    diagnosis?: string;
    conduct?: string;
    notes?: string;
    professionalId: string;
  }) {
    return this.prisma.clinicalRecord.create({
      data: {
        patientId: data.patientId,
        complaint: data.complaint,
        evaluation: data.evaluation,
        diagnosis: data.diagnosis,
        conduct: data.conduct,
        notes: data.notes,
        professionalId: data.professionalId,
      },
      include: { clinicalNotes: true },
    });
  }

  async update(
    id: string,
    data: {
      complaint?: string;
      evaluation?: string;
      diagnosis?: string;
      conduct?: string;
      notes?: string;
      status?: string;
    },
  ) {
    return this.prisma.clinicalRecord.update({
      where: { id },
      data: {
        ...(data.complaint !== undefined && { complaint: data.complaint }),
        ...(data.evaluation !== undefined && { evaluation: data.evaluation }),
        ...(data.diagnosis !== undefined && { diagnosis: data.diagnosis }),
        ...(data.conduct !== undefined && { conduct: data.conduct }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: { clinicalNotes: { orderBy: { date: 'desc' } } },
    });
  }

  async addNote(
    clinicalRecordId: string,
    data: {
      date: string;
      procedure?: string;
      region?: string;
      evolution?: string;
      intercurrence?: string;
      conduct?: string;
      nextFollowUp?: string;
      professionalId: string;
    },
  ) {
    await this.prisma.clinicalNote.create({
      data: {
        clinicalRecordId,
        date: new Date(data.date),
        procedure: data.procedure,
        region: data.region,
        evolution: data.evolution,
        intercurrence: data.intercurrence,
        conduct: data.conduct,
        nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : null,
        professionalId: data.professionalId,
      },
    });

    return this.prisma.clinicalRecord.findUnique({
      where: { id: clinicalRecordId },
      include: { clinicalNotes: { orderBy: { date: 'desc' } } },
    });
  }
}
