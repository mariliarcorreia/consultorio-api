import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

// Descreve só o que realmente usamos do arquivo enviado via multipart/form-data,
// assim não dependemos do pacote de tipos @types/multer (que não está instalado).
export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class AttachmentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async upload(patientId: string, file: UploadedFileData, uploadedBy: string) {
    const path = `${patientId}/${Date.now()}-${file.originalname}`;
    await this.storage.upload(path, file.buffer, file.mimetype);

    return this.prisma.attachment.create({
      data: {
        patientId,
        fileName: file.originalname,
        fileType: file.mimetype,
        storagePath: path,
        uploadedBy,
      },
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.attachment.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDownloadUrl(id: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) return null;
    const url = await this.storage.getSignedUrl(attachment.storagePath);
    return { url, fileName: attachment.fileName };
  }

  async remove(id: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) return null;
    await this.storage.remove(attachment.storagePath);
    return this.prisma.attachment.delete({ where: { id } });
  }
}
