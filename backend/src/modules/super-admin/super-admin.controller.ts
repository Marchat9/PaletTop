import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from './super-admin-auth.guard';

@Controller('super-admin')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminController {
    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(): void {
        // The guard performs the entire password + lockout check; reaching
        // this handler at all means authentication already succeeded.
    }
}
