import { Module } from '@nestjs/common';
import { TreatmentPlansService } from './treatment-plans.service';
import { TreatmentPlansController } from './treatment-plans.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [TreatmentPlansController],
  providers: [TreatmentPlansService],
})
export class TreatmentPlansModule {}
