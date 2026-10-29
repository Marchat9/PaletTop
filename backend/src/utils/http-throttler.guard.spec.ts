import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerException, ThrottlerStorageService } from '@nestjs/throttler';
import { describe, expect, it } from 'vitest';
import { HttpThrottlerGuard } from './http-throttler.guard';

class TestController {
    handle(): void {}
}

function makeContext(headers: Record<string, string>, ip = '10.0.0.1'): ExecutionContext {
    const request = { headers, ip };
    const response = { header: () => undefined };
    return {
        getType: () => 'http',
        getHandler: () => TestController.prototype.handle,
        getClass: () => TestController,
        switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as unknown as ExecutionContext;
}

// A limit of one request makes the second call from the same client fail.
async function makeGuard(): Promise<HttpThrottlerGuard> {
    const guard = new HttpThrottlerGuard(
        [{ ttl: 60_000, limit: 1 }],
        new ThrottlerStorageService(),
        new Reflector(),
    );
    await guard.onModuleInit();
    return guard;
}

describe('HttpThrottlerGuard', () => {
    // Behind the edge network every request comes from the reverse proxy: without the real client
    // IP, all the players of a tournament would share a single quota.
    it('gives each client its own quota behind the reverse proxy', async () => {
        const guard = await makeGuard();

        await expect(
            guard.canActivate(makeContext({ 'cf-connecting-ip': '1.1.1.1' })),
        ).resolves.toBe(true);
        await expect(
            guard.canActivate(makeContext({ 'cf-connecting-ip': '2.2.2.2' })),
        ).resolves.toBe(true);
    });

    it('still limits a single client', async () => {
        const guard = await makeGuard();

        await guard.canActivate(makeContext({ 'cf-connecting-ip': '1.1.1.1' }));

        await expect(
            guard.canActivate(makeContext({ 'cf-connecting-ip': '1.1.1.1' })),
        ).rejects.toThrow(ThrottlerException);
    });

    it('falls back to the socket IP without the edge network header', async () => {
        const guard = await makeGuard();

        await guard.canActivate(makeContext({}, '10.0.0.1'));

        await expect(guard.canActivate(makeContext({}, '10.0.0.1'))).rejects.toThrow(
            ThrottlerException,
        );
        await expect(guard.canActivate(makeContext({}, '10.0.0.2'))).resolves.toBe(true);
    });

    it('lets websocket messages through', async () => {
        const guard = await makeGuard();
        const wsContext = { getType: () => 'ws' } as unknown as ExecutionContext;

        await expect(guard.canActivate(wsContext)).resolves.toBe(true);
        await expect(guard.canActivate(wsContext)).resolves.toBe(true);
    });
});
