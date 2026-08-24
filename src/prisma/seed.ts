import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const clinic = await prisma.clinic.create({
    data: {
      name: 'Dra. Izadora Viana - Odontologia',
    },
  });

  const hashedPassword = await bcrypt.hash('TrocarSenha123', 10);

  const user = await prisma.user.create({
    data: {
      clinicId: clinic.id,
      name: 'Izadora Viana',
      email: 'izadora@consultoriodigital.com.br',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log('Clínica criada:', clinic.name);
  console.log('Usuário criado:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });