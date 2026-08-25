import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { AnamnesisModule } from './anamnesis/anamnesis.module';
import { ClinicalRecordsModule } from './clinical-records/clinical-records.module';
import { TreatmentPlansModule } from './treatment-plans/treatment-plans.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { ClinicsModule } from './clinics/clinics.module';
import { StorageModule } from './storage/storage.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { DocumentsModule } from './documents/documents.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { OdontogramModule } from './odontogram/odontogram.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PatientsModule,
    AnamnesisModule,
    ClinicalRecordsModule,
    TreatmentPlansModule,
    AuditModule,
    UsersModule,
    ClinicsModule,
    StorageModule,
    AttachmentsModule,
    DocumentsModule,
    AppointmentsModule,
    OdontogramModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
