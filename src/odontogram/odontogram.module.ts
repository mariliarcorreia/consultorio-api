import { Module } from '@nestjs/common';
import { OdontogramService } from './odontogram.service';
import { OdontogramController } from './odontogram.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [OdontogramController],
  providers: [OdontogramService],
})
export class OdontogramModule {}
