import { Controller, Get } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  findAll() {
    return this.auditService.findAll();
  }
}
