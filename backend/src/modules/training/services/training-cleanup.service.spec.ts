import { describe, expect, it, vi } from 'vitest';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingCleanupService } from './training-cleanup.service';

function makeService(empty: Partial<TrainingSession>[], enabled = true) {
    const sessionRepo = {
        findClosedWithoutParticipantOrRound: vi.fn(() => Promise.resolve(empty)),
        deleteMany: vi.fn(() => Promise.resolve()),
    };
    const schedulerRegistry = { addCronJob: vi.fn() };
    const configService = {
        getOrThrow: vi.fn(() => ({ enabled, cronExpression: '0 6 * * 1', retentionDays: 7 })),
    };
    const service = new TrainingCleanupService(
        configService as never,
        schedulerRegistry as never,
        sessionRepo as never,
    );
    return { service, sessionRepo, schedulerRegistry };
}

describe('TrainingCleanupService', () => {
    it('deletes the closed sessions without player or without round', async () => {
        const { service, sessionRepo } = makeService([
            { id: 's1', code: '123456' },
            { id: 's2', code: '654321' },
        ]);

        await service.runCleanup();

        expect(sessionRepo.findClosedWithoutParticipantOrRound).toHaveBeenCalledWith(7);
        expect(sessionRepo.deleteMany).toHaveBeenCalledWith(['s1', 's2']);
    });

    it('deletes nothing when there is no such session', async () => {
        const { service, sessionRepo } = makeService([]);

        await service.runCleanup();

        expect(sessionRepo.deleteMany).not.toHaveBeenCalled();
    });

    it('schedules the job only when enabled', () => {
        const enabled = makeService([], true);
        enabled.service.onModuleInit();
        expect(enabled.schedulerRegistry.addCronJob).toHaveBeenCalledWith(
            'training-session-cleanup',
            expect.anything(),
        );
        // The started job is stopped right away: the test must not leave a cron running.
        const job = enabled.schedulerRegistry.addCronJob.mock.calls[0][1] as { stop: () => void };
        job.stop();

        const disabled = makeService([], false);
        disabled.service.onModuleInit();
        expect(disabled.schedulerRegistry.addCronJob).not.toHaveBeenCalled();
    });
});
