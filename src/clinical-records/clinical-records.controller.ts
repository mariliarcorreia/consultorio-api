import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ClinicalRecordsService } from './clinical-records.service';

@Controller('clinical-records')
export class ClinicalRecordsController {
  constructor(private service: ClinicalRecordsService) {}

  @Get()
  findByPatient(@Query('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Post()
  create(
    @Body()
    body: {
      patientId: string;
      complaint?: string;
      evaluation?: string;
      diagnosis?: string;
      conduct?: string;
      notes?: string;
      professionalId: string;
    },
  ) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      complaint?: string;
      evaluation?: string;
      diagnosis?: string;
      conduct?: string;
      notes?: string;
      status?: string;
    },
  ) {
    return this.service.update(id, body);
  }

  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body()
    body: {
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
    return this.service.addNote(id, body);
  }
}
