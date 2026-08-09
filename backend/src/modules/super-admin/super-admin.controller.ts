import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { resolveClientIp } from './super-admin-ip.utils';
import { SuperAdminService } from './super-admin.service';

@Controller('super-admin')
export class SuperAdminController {
    constructor(private readonly superAdminService: SuperAdminService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() dto: SuperAdminLoginDto, @Req() request: Request): void {
        const ip = resolveClientIp(request.headers['cf-connecting-ip'], request.ip);
        this.superAdminService.login(dto.password, ip);
    }
}
