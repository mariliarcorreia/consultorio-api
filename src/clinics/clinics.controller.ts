import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClinicsService } from './clinics.service';
import type { UploadedFileData } from './clinics.service';
import type { WorkingHours } from '../appointments/working-hours.util';

@Controller('clinics')
export class ClinicsController {
  constructor(private clinicsService: ClinicsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clinicsService.findOne(id);
  }

  @Get(':id/logo')
  getLogoUrl(@Param('id') id: string) {
    return this.clinicsService.getLogoUrl(id);
  }

  @Get(':id/working-hours')
  getWorkingHours(@Param('id') id: string) {
    return this.clinicsService.getWorkingHours(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; cro?: string }) {
    return this.clinicsService.update(id, body);
  }

  @Patch(':id/working-hours')
  updateWorkingHours(@Param('id') id: string, @Body() body: WorkingHours) {
    return this.clinicsService.updateWorkingHours(id, body);
  }

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadLogo(@Param('id') id: string, @UploadedFile() file: UploadedFileData) {
    return this.clinicsService.uploadLogo(id, file);
  }
}
