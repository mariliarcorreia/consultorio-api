import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { ScheduleBlocksService } from './schedule-blocks.service';
import { ScheduleBlocksController } from './schedule-blocks.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AppointmentsController, ScheduleBlocksController],
  providers: [AppointmentsService, ScheduleBlocksService],
})
export class AppointmentsModule {}
