import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
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

  @Delete(':id')
  remove(@Param('id') id: string, @Query('actorUserId') actorUserId?: string) {
    return this.service.remove(id, actorUserId);
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.service.removeItem(id, itemId, actorUserId);
  }
}
