import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(clinicId: string) {
    const users = await this.prisma.user.findMany({
      where: { clinicId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return users.map(({ password, ...rest }) => rest);
  }

  async create(data: { clinicId: string; name: string; email: string; password: string; role: string }) {
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        clinicId: data.clinicId,
        name: data.name,
        email: data.email,
        password: hashed,
        role: data.role,
      },
    });
    const { password, ...rest } = user;
    return rest;
  }

  async update(id: string, data: { name?: string; role?: string; active?: boolean; password?: string }) {
    const updateData: Record<string, unknown> = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.active !== undefined && { active: data.active }),
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await this.prisma.user.update({ where: { id }, data: updateData });
    const { password, ...rest } = user;
    return rest;
  }
}
