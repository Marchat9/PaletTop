import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { resolveClientIp } from './super-admin-ip.utils';
import { SuperAdminService } from './super-admin.service';

@Injectable()
export class SuperAdminAuthGuard implements CanActivate {
    constructor(private readonly superAdminService: SuperAdminService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const password = (request.body as Record<string, unknown> | undefined)?.password;

        if (typeof password !== 'string' || !password) {
            throw new UnauthorizedException('Mot de passe invalide');
        }

        const ip = resolveClientIp(request.headers['cf-connecting-ip'], request.ip);
        this.superAdminService.login(password, ip);
        return true;
    }
}
