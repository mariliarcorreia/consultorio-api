import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(private service: AppointmentsService) {}

  @Get()
  findAll(
    @Query('clinicId') clinicId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.service.findAll(clinicId, start, end);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      clinicId: string;
      patientId: string;
      type?: string;
      location?: string;
      startsAt: string;
      endsAt: string;
      notes?: string;
      createdBy: string;
    },
  ) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      startsAt?: string;
      endsAt?: string;
      type?: string;
      location?: string;
      status?: string;
      notes?: string;
      actorUserId?: string;
    },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('actorUserId') actorUserId?: string) {
    return this.service.remove(id, actorUserId);
  }
}
