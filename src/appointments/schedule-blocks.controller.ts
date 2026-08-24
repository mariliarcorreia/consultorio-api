import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ScheduleBlocksService } from './schedule-blocks.service';

@Controller('schedule-blocks')
export class ScheduleBlocksController {
  constructor(private service: ScheduleBlocksService) {}

  @Get()
  findAll(
    @Query('clinicId') clinicId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.service.findAll(clinicId, start, end);
  }

  @Post()
  create(
    @Body() body: { clinicId: string; startsAt: string; endsAt: string; reason?: string },
  ) {
    return this.service.create(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
