import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TreatmentPlansService } from './treatment-plans.service';

@Controller('treatment-plans')
export class TreatmentPlansController {
  constructor(private service: TreatmentPlansService) {}

  @Get()
  findByPatient(@Query('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Post()
  create(
    @Body()
    body: {
      patientId: string;
      validUntil?: string;
    },
  ) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      status?: string;
      validUntil?: string;
    },
  ) {
    return this.service.update(id, body);
  }

  @Post(':id/items')
  addItem(
    @Param('id') id: string,
    @Body()
    body: {
      procedure: string;
      region?: string;
      quantity?: number;
      price: number;
      discount?: number;
      priority?: number;
    },
  ) {
    return this.service.addItem(id, body);
  }
}
