import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AnamnesisService } from './anamnesis.service';

@Controller('anamnesis')
export class AnamnesisController {
  constructor(private anamnesisService: AnamnesisService) {}

  @Post()
  create(
    @Body()
    body: {
      patientId: string;
      answers: Record<string, unknown>;
      filledBy: string;
    },
  ) {
    return this.anamnesisService.create(body);
  }

  @Get()
  findByPatient(@Query('patientId') patientId: string) {
    return this.anamnesisService.findByPatient(patientId);
  }
}
