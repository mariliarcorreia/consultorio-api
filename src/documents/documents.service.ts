import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { PdfService } from './pdf.service';
import { preencherModelo } from './placeholders.util';

// Descreve só o que realmente usamos do arquivo enviado via multipart/form-data,
// assim não dependemos do pacote de tipos @types/multer (que não está instalado).
export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

function formatarData(data: Date) {
  return data.toLocaleDateString('pt-BR');
}

type ClinicComLogo = { name: string; cro: string | null; logoUrl: string | null };

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private audit: AuditService,
    private pdf: PdfService,
  ) {}

  async findByPatient(patientId: string) {
    return this.prisma.generatedDocument.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { template: { select: { title: true, code: true } } },
    });
  }

  private async baixarLogo(clinic: ClinicComLogo | null | undefined): Promise<Buffer | null> {
    if (!clinic?.logoUrl) return null;
    try {
      return await this.storage.download(clinic.logoUrl);
    } catch {
      // Se a logo não puder ser baixada, o documento ainda é gerado sem ela.
      return null;
    }
  }

  private async montarDadosAutomaticos(patientId: string, createdBy?: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const clinic = await this.prisma.clinic.findUnique({ where: { id: patient.clinicId } });

    const dados: Record<string, string> = {
      paciente_nome: patient.fullName,
      paciente_cpf: patient.cpf ?? '',
      paciente_nascimento: patient.birthDate ? formatarData(new Date(patient.birthDate)) : '',
      paciente_endereco: [patient.address, patient.city, patient.state].filter(Boolean).join(', '),
      clinica_nome: clinic?.name ?? '',
      data_hoje: formatarData(new Date()),
      profissional_nome: '',
    };

    if (createdBy) {
      const profissional = await this.prisma.user.findUnique({ where: { id: createdBy } });
      if (profissional) dados.profissional_nome = profissional.name;
    }

    const logoBuffer = await this.baixarLogo(clinic);

    return { dados, clinicaNome: clinic?.name ?? '', clinicaCro: clinic?.cro ?? null, logoBuffer };
  }

  async gerar(params: {
    patientId: string;
    templateId: string;
    fieldsData?: Record<string, string>;
    createdBy: string;
  }) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id: params.templateId },
    });
    if (!template) throw new NotFoundException('Modelo não encontrado.');

    const { dados, clinicaNome, clinicaCro, logoBuffer } = await this.montarDadosAutomaticos(
      params.patientId,
      params.createdBy,
    );
    const dadosCompletos = { ...dados, ...(params.fieldsData ?? {}) };
    const corpoPreenchido = preencherModelo(template.content, dadosCompletos);

    const pdfBuffer = await this.pdf.gerarDocumento({
      clinicaNome,
      clinicaCro,
      logoBuffer,
      titulo: template.title,
      corpo: corpoPreenchido,
    });

    const path = `${params.patientId}/${Date.now()}-${template.code}.pdf`;
    await this.storage.upload(path, pdfBuffer, 'application/pdf');

    const documento = await this.prisma.generatedDocument.create({
      data: {
        patientId: params.patientId,
        templateId: params.templateId,
        title: template.title,
        fileUrl: path,
        fieldsData: dadosCompletos,
        createdBy: params.createdBy,
      },
    });

    await this.audit.log({
      userId: params.createdBy,
      action: 'create',
      resource: 'generated_document',
      resourceId: documento.id,
      newValue: { title: documento.title },
    });

    return documento;
  }

  async assinarDigital(id: string, signatureImage: string, actorUserId?: string) {
    const documento = await this.prisma.generatedDocument.findUnique({
      where: { id },
      include: { template: true, patient: true },
    });
    if (!documento) throw new NotFoundException('Documento não encontrado.');

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: documento.patient.clinicId },
    });
    const logoBuffer = await this.baixarLogo(clinic);
    const corpoPreenchido = preencherModelo(
      documento.template.content,
      (documento.fieldsData as Record<string, string>) ?? {},
    );

    const assinadoEm = new Date();
    const pdfBuffer = await this.pdf.gerarDocumento({
      clinicaNome: clinic?.name ?? '',
      clinicaCro: clinic?.cro ?? null,
      logoBuffer,
      titulo: documento.title,
      corpo: corpoPreenchido,
      assinaturaImagemBase64: signatureImage,
      assinadoEm,
    });

    await this.storage.upload(documento.fileUrl, pdfBuffer, 'application/pdf');

    const atualizado = await this.prisma.generatedDocument.update({
      where: { id },
      data: {
        status: 'assinado',
        signatureMethod: 'digital',
        signatureImage,
        signedAt: assinadoEm,
      },
    });

    if (actorUserId) {
      await this.audit.log({
        userId: actorUserId,
        action: 'sign',
        resource: 'generated_document',
        resourceId: id,
      });
    }

    return atualizado;
  }

  async assinarEscaneado(id: string, file: UploadedFileData, actorUserId?: string) {
    const documento = await this.prisma.generatedDocument.findUnique({ where: { id } });
    if (!documento) throw new NotFoundException('Documento não encontrado.');

    await this.storage.upload(documento.fileUrl, file.buffer, file.mimetype);

    const atualizado = await this.prisma.generatedDocument.update({
      where: { id },
      data: {
        status: 'assinado',
        signatureMethod: 'escaneado',
        signedAt: new Date(),
      },
    });

    if (actorUserId) {
      await this.audit.log({
        userId: actorUserId,
        action: 'sign',
        resource: 'generated_document',
        resourceId: id,
      });
    }

    return atualizado;
  }

  async getDownloadUrl(id: string) {
    const documento = await this.prisma.generatedDocument.findUnique({ where: { id } });
    if (!documento) return null;
    const url = await this.storage.getSignedUrl(documento.fileUrl);
    return { url, fileName: `${documento.title}.pdf` };
  }

  async remove(id: string, actorUserId?: string) {
    const documento = await this.prisma.generatedDocument.findUnique({ where: { id } });
    if (!documento) return null;
    await this.storage.remove(documento.fileUrl);
    const removido = await this.prisma.generatedDocument.delete({ where: { id } });

    if (actorUserId) {
      await this.audit.log({
        userId: actorUserId,
        action: 'delete',
        resource: 'generated_document',
        resourceId: id,
      });
    }

    return removido;
  }
}
