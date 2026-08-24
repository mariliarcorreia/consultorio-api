import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { HORARIO_PADRAO, normalizarHorarios, WorkingHours } from '../appointments/working-hours.util';

// Descreve só o que realmente usamos do arquivo enviado via multipart/form-data,
// assim não dependemos do pacote de tipos @types/multer (que não está instalado).
export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class ClinicsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async findOne(id: string) {
    return this.prisma.clinic.findUnique({ where: { id } });
  }

  async update(id: string, data: { name?: string; cro?: string }) {
    return this.prisma.clinic.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.cro !== undefined && { cro: data.cro }),
      },
    });
  }

  async uploadLogo(id: string, file: UploadedFileData) {
    const extensao = file.originalname.split('.').pop() || 'png';
    const path = `_clinica/${id}/logo.${extensao}`;
    await this.storage.upload(path, file.buffer, file.mimetype);
    return this.prisma.clinic.update({ where: { id }, data: { logoUrl: path } });
  }

  async getLogoUrl(id: string) {
    const clinic = await this.prisma.clinic.findUnique({ where: { id } });
    if (!clinic?.logoUrl) return { url: null };
    const url = await this.storage.getSignedUrl(clinic.logoUrl);
    return { url };
  }

  async getWorkingHours(id: string): Promise<WorkingHours> {
    const clinic = await this.prisma.clinic.findUnique({ where: { id } });
    return normalizarHorarios(clinic?.workingHours ?? HORARIO_PADRAO);
  }

  async updateWorkingHours(id: string, horarios: WorkingHours) {
    await this.prisma.clinic.update({
      where: { id },
      data: { workingHours: horarios as any },
    });
    return horarios;
  }
}
