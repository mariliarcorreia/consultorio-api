import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { OdontogramService } from './odontogram.service';

@Controller('odontogram')
export class OdontogramController {
  constructor(private service: OdontogramService) {}

  @Get()
  findByPatient(@Query('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Post()
  create(
    @Body()
    body: {
      patientId: string;
      toothNumber: number;
      surfaces?: string[];
      condition: string;
      status: string;
      observation?: string;
      professionalId: string;
    },
  ) {
    return this.service.create(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('actorUserId') actorUserId?: string) {
    return this.service.remove(id, actorUserId);
  }

  @Post(':id/plano-tratamento')
  adicionarAoPlano(
    @Param('id') id: string,
    @Body() body: { procedure: string; price?: number; actorUserId?: string },
  ) {
    return this.service.adicionarAoPlano(id, body);
  }
}
