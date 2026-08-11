import { describe, expect, it, vi } from 'vitest';
import { HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
    it('returns the result of an indicator-less health check', async () => {
        const result: HealthCheckResult = { status: 'ok', info: {}, error: {}, details: {} };
        const health = {
            check: vi.fn().mockResolvedValue(result),
        } as unknown as HealthCheckService;
        const controller = new HealthController(health);

        await expect(controller.check()).resolves.toEqual(result);
        expect(health.check).toHaveBeenCalledWith([]);
    });
});
