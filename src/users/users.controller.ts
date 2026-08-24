import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@Query('clinicId') clinicId: string) {
    return this.usersService.findAll(clinicId);
  }

  @Post()
  create(
    @Body()
    body: {
      clinicId: string;
      name: string;
      email: string;
      password: string;
      role: string;
    },
  ) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      role?: string;
      active?: boolean;
      password?: string;
    },
  ) {
    return this.usersService.update(id, body);
  }
}
