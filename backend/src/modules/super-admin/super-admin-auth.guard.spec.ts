import { describe, expect, it, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SuperAdminAuthGuard } from './super-admin-auth.guard';
import { SuperAdminService } from './super-admin.service';

function makeContext(
    body: unknown,
    headers: Record<string, string | undefined> = {},
    ip = '10.0.0.1',
): ExecutionContext {
    const request = { body, headers, ip };
    return {
        switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
}

describe('SuperAdminAuthGuard', () => {
    it('allows the request through and delegates to SuperAdminService.login', () => {
        const superAdminService = { login: vi.fn() } as unknown as SuperAdminService;
        const guard = new SuperAdminAuthGuard(superAdminService);

        const result = guard.canActivate(makeContext({ password: 'secret' }));

        expect(result).toBe(true);
        expect(superAdminService.login).toHaveBeenCalledWith('secret', '10.0.0.1');
    });

    it('propagates whatever the service throws on an invalid password', () => {
        const superAdminService = {
            login: vi.fn(() => {
                throw new UnauthorizedException('Mot de passe invalide');
            }),
        } as unknown as SuperAdminService;
        const guard = new SuperAdminAuthGuard(superAdminService);

        expect(() => guard.canActivate(makeContext({ password: 'wrong' }))).toThrow(
            UnauthorizedException,
        );
    });

    it('rejects a body with no password field, without calling the service', () => {
        const superAdminService = { login: vi.fn() } as unknown as SuperAdminService;
        const guard = new SuperAdminAuthGuard(superAdminService);

        expect(() => guard.canActivate(makeContext({}))).toThrow(UnauthorizedException);
        expect(superAdminService.login).not.toHaveBeenCalled();
    });

    it('resolves the IP from CF-Connecting-IP when present, matching the login endpoint', () => {
        const superAdminService = { login: vi.fn() } as unknown as SuperAdminService;
        const guard = new SuperAdminAuthGuard(superAdminService);

        guard.canActivate(makeContext({ password: 'secret' }, { 'cf-connecting-ip': '1.2.3.4' }));

        expect(superAdminService.login).toHaveBeenCalledWith('secret', '1.2.3.4');
    });
});
