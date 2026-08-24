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
import { AttachmentsService } from './attachments.service';
import type { UploadedFileData } from './attachments.service';

@Controller('attachments')
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(
    @UploadedFile() file: UploadedFileData,
    @Body('patientId') patientId: string,
    @Body('uploadedBy') uploadedBy: string,
  ) {
    return this.attachmentsService.upload(patientId, file, uploadedBy);
  }

  @Get()
  findByPatient(@Query('patientId') patientId: string) {
    return this.attachmentsService.findByPatient(patientId);
  }

  @Get(':id/download')
  getDownloadUrl(@Param('id') id: string) {
    return this.attachmentsService.getDownloadUrl(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attachmentsService.remove(id);
  }
}
