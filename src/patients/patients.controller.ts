import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PatientsService } from './patients.service';

@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Post()
  create(
    @Body()
    body: {
      clinicId: string;
      fullName: string;
      socialName?: string;
      birthDate: string;
      cpf?: string;
      rg?: string;
      phone?: string;
      whatsapp?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      guardianName?: string;
      guardianCpf?: string;
      guardianPhone?: string;
      location?: string;
      actorUserId?: string;
    },
  ) {
    return this.patientsService.create(body);
  }

  @Get()
  findAll(@Query('clinicId') clinicId: string) {
    return this.patientsService.findAll(clinicId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      fullName?: string;
      socialName?: string;
      birthDate?: string;
      cpf?: string;
      rg?: string;
      phone?: string;
      whatsapp?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      guardianName?: string;
      guardianCpf?: string;
      guardianPhone?: string;
      location?: string;
      status?: string;
      actorUserId?: string;
    },
  ) {
    return this.patientsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('actorUserId') actorUserId?: string) {
    return this.patientsService.remove(id, actorUserId);
  }
}
