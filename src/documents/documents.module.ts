import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentTemplatesService } from './document-templates.service';
import { DocumentTemplatesController } from './document-templates.controller';
import { PdfService } from './pdf.service';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [StorageModule, AuditModule],
  controllers: [DocumentsController, DocumentTemplatesController],
  providers: [DocumentsService, DocumentTemplatesService, PdfService],
})
export class DocumentsModule {}
