import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserPayload } from '../auth/auth.service';

@Controller('api/v1/me')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getProfile(@CurrentUser() user: UserPayload) {
    const data = await this.userService.getProfile(user.sub);
    return { success: true, data };
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: UserPayload,
    @Body() body: { name?: string },
  ) {
    const data = await this.userService.updateProfile(user.sub, body);
    return { success: true, data };
  }

  @Get('addresses')
  async listAddresses(@CurrentUser() user: UserPayload) {
    const data = await this.userService.listAddresses(user.sub);
    return { success: true, data };
  }

  @Post('addresses')
  @HttpCode(HttpStatus.CREATED)
  async createAddress(@CurrentUser() user: UserPayload, @Body() body: any) {
    const data = await this.userService.createAddress(user.sub, body);
    return { success: true, data };
  }

  @Patch('addresses/:id')
  async updateAddress(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const data = await this.userService.updateAddress(user.sub, id, body);
    return { success: true, data };
  }

  @Delete('addresses/:id')
  async deleteAddress(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
  ) {
    const data = await this.userService.deleteAddress(user.sub, id);
    return { success: true, data };
  }
}

