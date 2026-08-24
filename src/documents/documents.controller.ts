import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import type { UploadedFileData } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get()
  findByPatient(@Query('patientId') patientId: string) {
    return this.documentsService.findByPatient(patientId);
  }

  @Post('generate')
  gerar(
    @Body()
    body: {
      patientId: string;
      templateId: string;
      fieldsData?: Record<string, string>;
      createdBy: string;
    },
  ) {
    return this.documentsService.gerar(body);
  }

  @Post(':id/sign-digital')
  assinarDigital(
    @Param('id') id: string,
    @Body() body: { signatureImage: string; actorUserId?: string },
  ) {
    return this.documentsService.assinarDigital(id, body.signatureImage, body.actorUserId);
  }

  @Post(':id/sign-scan')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  assinarEscaneado(
    @Param('id') id: string,
    @UploadedFile() file: UploadedFileData,
    @Body('actorUserId') actorUserId?: string,
  ) {
    return this.documentsService.assinarEscaneado(id, file, actorUserId);
  }

  @Get(':id/download')
  getDownloadUrl(@Param('id') id: string) {
    return this.documentsService.getDownloadUrl(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('actorUserId') actorUserId?: string) {
    return this.documentsService.remove(id, actorUserId);
  }
}
