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
    it('allows the request through and delegates to SuperAdminService.login', async () => {
        const superAdminService = {
            login: vi.fn().mockResolvedValue(undefined),
        } as unknown as SuperAdminService;
        const guard = new SuperAdminAuthGuard(superAdminService);

        const result = await guard.canActivate(makeContext({ password: 'secret' }));

        expect(result).toBe(true);
        expect(superAdminService.login).toHaveBeenCalledWith('secret', '10.0.0.1');
    });

    it('propagates whatever the service rejects with on an invalid password', async () => {
        const superAdminService = {
            login: vi.fn().mockRejectedValue(new UnauthorizedException('Mot de passe invalide')),
        } as unknown as SuperAdminService;
        const guard = new SuperAdminAuthGuard(superAdminService);

        await expect(guard.canActivate(makeContext({ password: 'wrong' }))).rejects.toThrow(
            UnauthorizedException,
        );
    });

    it('rejects a body with no password field, without calling the service', async () => {
        const superAdminService = { login: vi.fn() } as unknown as SuperAdminService;
        const guard = new SuperAdminAuthGuard(superAdminService);

        await expect(guard.canActivate(makeContext({}))).rejects.toThrow(UnauthorizedException);
        expect(superAdminService.login).not.toHaveBeenCalled();
    });

    it('resolves the IP from CF-Connecting-IP when present, matching the login endpoint', async () => {
        const superAdminService = {
            login: vi.fn().mockResolvedValue(undefined),
        } as unknown as SuperAdminService;
        const guard = new SuperAdminAuthGuard(superAdminService);

        await guard.canActivate(
            makeContext({ password: 'secret' }, { 'cf-connecting-ip': '1.2.3.4' }),
        );

        expect(superAdminService.login).toHaveBeenCalledWith('secret', '1.2.3.4');
    });
});
