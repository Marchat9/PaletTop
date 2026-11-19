import { describe, expect, it, vi } from 'vitest';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingCleanupService } from './training-cleanup.service';

function makeService(empty: Partial<TrainingSession>[], enabled = true) {
    const sessionRepo = {
        findClosedWithoutParticipantOrRound: vi.fn(() => Promise.resolve(empty)),
        deleteMany: vi.fn(() => Promise.resolve()),
    };
    const schedulerRegistry = {
        addCronJob: vi.fn(),
        doesExist: vi.fn(() => false),
        deleteCronJob: vi.fn(),
    };
    let watcher: ((value: unknown) => void) | undefined;
    const appSettingsService = {
        get: vi.fn(() =>
            Promise.resolve({ enabled, cronExpression: '0 6 * * 1', retentionDays: 7 }),
        ),
        watch: vi.fn((_key: string, listener: (value: unknown) => void) => {
            watcher = listener;
            return { unsubscribe: vi.fn() };
        }),
    };
    const service = new TrainingCleanupService(
        appSettingsService as never,
        schedulerRegistry as never,
        sessionRepo as never,
    );
    return {
        service,
        sessionRepo,
        schedulerRegistry,
        emitChange: (value: unknown) => watcher?.(value),
    };
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

    it('schedules the job only when enabled', async () => {
        const enabled = makeService([], true);
        await enabled.service.onModuleInit();
        expect(enabled.schedulerRegistry.addCronJob).toHaveBeenCalledWith(
            'training-session-cleanup',
            expect.anything(),
        );
        // The started job is stopped right away: the test must not leave a cron running.
        const job = enabled.schedulerRegistry.addCronJob.mock.calls[0][1] as { stop: () => void };
        job.stop();

        const disabled = makeService([], false);
        await disabled.service.onModuleInit();
        expect(disabled.schedulerRegistry.addCronJob).not.toHaveBeenCalled();
    });

    it('reschedules the job when the super-admin changes the setting', async () => {
        const { service, schedulerRegistry, emitChange } = makeService([], false);
        await service.onModuleInit();
        schedulerRegistry.doesExist.mockReturnValue(true);

        emitChange({ enabled: true, cronExpression: '0 4 * * *', retentionDays: 3 });

        expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith('training-session-cleanup');
        expect(schedulerRegistry.addCronJob).toHaveBeenCalledTimes(1);
        const job = schedulerRegistry.addCronJob.mock.calls[0][1] as { stop: () => void };
        job.stop();

        emitChange({ enabled: false, cronExpression: '0 4 * * *', retentionDays: 3 });
        expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledTimes(2);
        expect(schedulerRegistry.addCronJob).toHaveBeenCalledTimes(1);
    });
});
