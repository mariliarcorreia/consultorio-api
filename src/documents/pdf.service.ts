import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
  async gerarDocumento(params: {
    clinicaNome: string;
    clinicaCro?: string | null;
    logoBuffer?: Buffer | null;
    titulo: string;
    corpo: string;
    assinaturaImagemBase64?: string | null;
    assinadoEm?: Date | null;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 56 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const larguraUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const topoCabecalho = doc.y;
      const alturaLogo = 46;

      if (params.logoBuffer) {
        try {
          doc.image(params.logoBuffer, doc.page.margins.left, topoCabecalho, { height: alturaLogo });
        } catch {
          // Se a logo estiver corrompida, o documento ainda é gerado sem ela.
        }
      }

      doc
        .fontSize(11)
        .fillColor('#292524')
        .text(params.clinicaNome || '', doc.page.margins.left, topoCabecalho, {
          width: larguraUtil,
          align: 'right',
        });
      if (params.clinicaCro) {
        doc.fontSize(9).fillColor('#78716c').text(params.clinicaCro, {
          width: larguraUtil,
          align: 'right',
        });
      }

      // Garante que o título comece abaixo do que for mais alto entre a logo e o texto do cabeçalho,
      // independente do tamanho da imagem enviada pela clínica.
      const alturaTexto = doc.y - topoCabecalho;
      doc.x = doc.page.margins.left;
      doc.y = topoCabecalho + Math.max(alturaLogo, alturaTexto) + 48;

      doc.fontSize(16).fillColor('#292524').text(params.titulo, { align: 'left' });
      doc.moveDown(1);
      doc.fontSize(11).fillColor('#292524').text(params.corpo, {
        align: 'justify',
        lineGap: 4,
      });

      doc.moveDown(3);

      if (params.assinaturaImagemBase64) {
        try {
          const base64 = params.assinaturaImagemBase64.split(',').pop() ?? '';
          const imagemBuffer = Buffer.from(base64, 'base64');
          doc.image(imagemBuffer, { fit: [220, 90] });
          doc.moveDown(0.5);
        } catch {
          // Se a assinatura vier corrompida, o documento ainda é gerado sem ela.
        }
      }

      const xInicial = doc.x;
      const yLinha = doc.y;
      doc
        .moveTo(xInicial, yLinha)
        .lineTo(xInicial + 260, yLinha)
        .strokeColor('#a8a29e')
        .stroke();
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor('#78716c').text('Assinatura do paciente / responsável');

      if (params.assinadoEm) {
        doc.moveDown(0.5);
        doc
          .fontSize(9)
          .fillColor('#78716c')
          .text(`Assinado digitalmente em ${params.assinadoEm.toLocaleString('pt-BR')}`);
      }

      doc.end();
    });
  }
}
