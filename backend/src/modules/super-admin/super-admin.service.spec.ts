import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { HttpException, Logger, UnauthorizedException } from '@nestjs/common';
import { SuperAdminConfig } from 'src/config/super-admin.config';
import { hashPassword } from 'src/utils/password-hash.util';
import { SuperAdminService } from './super-admin.service';

let passwordHash: string;

function makeService(overrides: Partial<SuperAdminConfig> = {}): SuperAdminService {
    const config: SuperAdminConfig = {
        passwordHash,
        maxAttempts: 3,
        lockoutBaseDelaySeconds: 30,
        lockoutMaxDelaySeconds: 1800,
        maxPageSize: 100,
        ...overrides,
    };
    const configService = { getOrThrow: () => config } as unknown as ConfigService;
    return new SuperAdminService(configService);
}

async function statusOf(login: Promise<void>): Promise<number> {
    try {
        await login;
        return 200;
    } catch (error) {
        return (error as HttpException).getStatus();
    }
}

describe('SuperAdminService', () => {
    beforeAll(async () => {
        passwordHash = await hashPassword('secret');
    });

    beforeEach(() => {
        // Only Date is faked: argon2 completes on the libuv thread pool, not on timers.
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(0);
        vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('resolves on a correct password', async () => {
        const service = makeService();

        await expect(service.login('secret', '1.1.1.1')).resolves.toBeUndefined();
    });

    it('rejects with Unauthorized on a wrong password under the attempt threshold', async () => {
        const service = makeService({ maxAttempts: 3 });

        await expect(service.login('wrong', '1.1.1.1')).rejects.toThrow(UnauthorizedException);
        await expect(service.login('wrong', '1.1.1.1')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects the hash value itself used as a password', async () => {
        const service = makeService();

        await expect(service.login(passwordHash, '1.1.1.1')).rejects.toThrow(
            UnauthorizedException,
        );
    });

    it('locks out after reaching the attempt threshold, returning 429', async () => {
        const service = makeService({ maxAttempts: 3 });

        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(429);
    });

    it('rejects even the correct password while locked out', async () => {
        const service = makeService({ maxAttempts: 1 });

        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(429);
        expect(await statusOf(service.login('secret', '1.1.1.1'))).toBe(429);
    });

    it('allows normal attempts again once the lockout has expired', async () => {
        // maxAttempts: 2 so that the attempt after expiry is a plain 401, not a new lockout.
        const service = makeService({ maxAttempts: 2, lockoutBaseDelaySeconds: 30 });

        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(429); // 30s lockout

        vi.setSystemTime(30_001);

        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
    });

    it('doubles the lockout duration on each consecutive lockout', async () => {
        const service = makeService({
            maxAttempts: 2,
            lockoutBaseDelaySeconds: 30,
            lockoutMaxDelaySeconds: 1800,
        });

        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(429); // lockout #1: 30s

        vi.setSystemTime(30_001);
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(429); // lockout #2: 60s

        vi.setSystemTime(30_001 + 59_000);
        expect(await statusOf(service.login('secret', '1.1.1.1'))).toBe(429);

        vi.setSystemTime(30_001 + 60_001);
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
    });

    it('caps the lockout duration at lockoutMaxDelaySeconds', async () => {
        const service = makeService({
            maxAttempts: 2,
            lockoutBaseDelaySeconds: 10,
            lockoutMaxDelaySeconds: 15,
        });

        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(429); // lockout #1: 10s

        vi.setSystemTime(10_001);
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(429); // 20s capped to 15s

        vi.setSystemTime(10_001 + 14_000);
        expect(await statusOf(service.login('secret', '1.1.1.1'))).toBe(429);

        vi.setSystemTime(10_001 + 15_001);
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
    });

    it('fully resets the failure count on a successful login', async () => {
        const service = makeService({ maxAttempts: 3 });

        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
        expect(await statusOf(service.login('secret', '1.1.1.1'))).toBe(200);

        // Would be a lockout at 3 consecutive failures if the counter had not been reset.
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
    });

    it('tracks lockouts independently per IP', async () => {
        const service = makeService({ maxAttempts: 2 });

        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(401);
        expect(await statusOf(service.login('wrong', '1.1.1.1'))).toBe(429);

        expect(await statusOf(service.login('wrong', '2.2.2.2'))).toBe(401);
    });

    it('counts concurrent wrong attempts from one IP', async () => {
        const service = makeService({ maxAttempts: 3 });

        await Promise.allSettled([
            service.login('wrong', '1.1.1.1'),
            service.login('wrong', '1.1.1.1'),
            service.login('wrong', '1.1.1.1'),
        ]);

        expect(await statusOf(service.login('secret', '1.1.1.1'))).toBe(429);
    });

    it('answers 429 to parallel attempts finishing after the lockout, revealing nothing', async () => {
        const service = makeService({ maxAttempts: 3 });

        const statuses = await Promise.all(
            Array.from({ length: 6 }, () => statusOf(service.login('wrong', '1.1.1.1'))),
        );

        expect(statuses.filter((status) => status === 401)).toHaveLength(2);
        expect(statuses.filter((status) => status === 429)).toHaveLength(4);
    });
});
