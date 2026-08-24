import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DocumentTemplatesService } from './document-templates.service';

@Controller('document-templates')
export class DocumentTemplatesController {
  constructor(private templatesService: DocumentTemplatesService) {}

  @Get()
  findAll(
    @Query('clinicId') clinicId: string,
    @Query('code') code?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.templatesService.findAll(clinicId, code, includeInactive === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Get(':id/campos-personalizados')
  camposPersonalizados(@Param('id') id: string) {
    return this.templatesService.camposPersonalizados(id);
  }

  @Post()
  create(
    @Body()
    body: { clinicId: string; code: string; title: string; content: string },
  ) {
    return this.templatesService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string; active?: boolean },
  ) {
    return this.templatesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }
}
