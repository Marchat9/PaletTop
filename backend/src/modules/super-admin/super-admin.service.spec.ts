import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { HttpException, UnauthorizedException } from '@nestjs/common';
import { SuperAdminConfig } from 'src/config/super-admin.config';
import { SuperAdminService } from './super-admin.service';

function makeService(overrides: Partial<SuperAdminConfig> = {}): SuperAdminService {
    const config: SuperAdminConfig = {
        password: 'secret',
        maxAttempts: 3,
        lockoutBaseDelaySeconds: 30,
        lockoutMaxDelaySeconds: 1800,
        ...overrides,
    };
    const configService = { getOrThrow: () => config } as unknown as ConfigService;
    return new SuperAdminService(configService);
}

describe('SuperAdminService', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not throw on a correct password', () => {
        const service = makeService();

        expect(() => service.login('secret', '1.1.1.1')).not.toThrow();
    });

    it('throws Unauthorized on a wrong password under the attempt threshold', () => {
        const service = makeService({ maxAttempts: 3 });

        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException);
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException);
    });

    it('locks out after reaching the attempt threshold, returning 429', () => {
        const service = makeService({ maxAttempts: 3 });

        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException);
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException);

        let caught: unknown;
        try {
            service.login('wrong', '1.1.1.1');
        } catch (error) {
            caught = error;
        }
        expect(caught).toBeInstanceOf(HttpException);
        expect((caught as HttpException).getStatus()).toBe(429);
    });

    it('rejects even the correct password while locked out, without a fresh check', () => {
        const service = makeService({ maxAttempts: 1 });

        expect(() => service.login('wrong', '1.1.1.1')).toThrow(); // triggers lockout immediately

        let caught: unknown;
        try {
            service.login('secret', '1.1.1.1'); // correct password, but still locked
        } catch (error) {
            caught = error;
        }
        expect(caught).toBeInstanceOf(HttpException);
        expect((caught as HttpException).getStatus()).toBe(429);
    });

    it('allows normal attempts again once the lockout has expired', () => {
        // maxAttempts: 2 (not 1) deliberately — with 1, the wrong-password call
        // that "resumes normal attempts" below would itself immediately retrigger
        // a fresh lockout (429), not the plain 401 this test is checking for.
        const service = makeService({ maxAttempts: 2, lockoutBaseDelaySeconds: 30 });

        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException); // 1/2
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(); // 2/2 → triggers a 30s lockout

        vi.setSystemTime(30_001); // 30s + 1ms later

        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException); // fresh 1/2 → 401, not 429
    });

    it('doubles the lockout duration on each consecutive lockout', () => {
        // maxAttempts: 2 (not 1) deliberately — with 1, the final "unlocked again"
        // assertion below would itself immediately retrigger a third lockout (429),
        // not the plain 401 it's checking for. See the "allows normal attempts
        // again" and "tracks lockouts independently per IP" tests for the same fix.
        const service = makeService({
            maxAttempts: 2,
            lockoutBaseDelaySeconds: 30,
            lockoutMaxDelaySeconds: 1800,
        });

        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException); // 1/2
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(); // 2/2 → lockout #1: 30s

        vi.setSystemTime(30_001); // 30s + 1ms later: lockout #1 expired
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException); // fresh 1/2 → 401, proves unlock
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(); // 2/2 → lockout #2, must now be 60s (2x)

        vi.setSystemTime(30_001 + 59_000); // 59s after lockout #2 started: still locked
        let caught: unknown;
        try {
            service.login('secret', '1.1.1.1');
        } catch (error) {
            caught = error;
        }
        expect((caught as HttpException).getStatus()).toBe(429);

        vi.setSystemTime(30_001 + 60_001); // 60s + 1ms after lockout #2 started: expired
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException); // fresh 1/2 → 401, not 429
    });

    it('caps the lockout duration at lockoutMaxDelaySeconds', () => {
        // maxAttempts: 2 (not 1) for the same reason as above.
        const service = makeService({
            maxAttempts: 2,
            lockoutBaseDelaySeconds: 10,
            lockoutMaxDelaySeconds: 15,
        });

        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException); // 1/2
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(); // 2/2 → lockout #1: 10s (10 < 15, not capped)

        vi.setSystemTime(10_001); // lockout #1 expired
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException); // fresh 1/2 → 401, proves unlock
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(); // 2/2 → lockout #2 would be 20s, capped to 15s

        vi.setSystemTime(10_001 + 14_000); // 14s after lockout #2 started: still locked (cap is 15s)
        let caught: unknown;
        try {
            service.login('secret', '1.1.1.1');
        } catch (error) {
            caught = error;
        }
        expect((caught as HttpException).getStatus()).toBe(429);

        vi.setSystemTime(10_001 + 15_001); // 15s + 1ms after lockout #2 started: expired
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException); // fresh 1/2 → 401, not 429
    });

    it('fully resets the failure count on a successful login', () => {
        const service = makeService({ maxAttempts: 3 });

        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException); // 1/3
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException); // 2/3
        expect(() => service.login('secret', '1.1.1.1')).not.toThrow(); // success resets to 0/3

        // Two more failures after a successful login should NOT trigger a lockout
        // (would have, at 3 consecutive fails, if the counter hadn't been reset).
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException);
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException);
    });

    it('tracks lockouts independently per IP', () => {
        // maxAttempts: 2 (not 1) deliberately — with 1, a single wrong attempt on
        // 2.2.2.2 would trigger its own independent lockout too (429), which would
        // make this test pass for the wrong reason. With 2, IP 2.2.2.2's first-ever
        // wrong attempt must stay a plain 401 unless it was contaminated by 1.1.1.1's
        // state.
        const service = makeService({ maxAttempts: 2 });

        expect(() => service.login('wrong', '1.1.1.1')).toThrow(UnauthorizedException); // 1/2
        expect(() => service.login('wrong', '1.1.1.1')).toThrow(); // 2/2 → locks out 1.1.1.1 (429)

        let caught: unknown;
        try {
            service.login('wrong', '2.2.2.2'); // different IP, first-ever attempt
        } catch (error) {
            caught = error;
        }
        expect(caught).toBeInstanceOf(UnauthorizedException); // 401, not 429 — proves isolation
    });
});
