import { describe, expect, it, vi } from 'vitest';
import { CleanupConfig, DEFAULT_CLEANUP_CONFIG } from 'src/config/cleanup.config';
import { CleanupService } from './cleanup.service';

function makeService(config: CleanupConfig) {
    const tournamentRepo = {
        findExpiredCompleted: vi.fn(() => Promise.resolve([{ id: 't1', code: 'AAAA' }])),
        findExpiredDrafts: vi.fn(() => Promise.resolve([])),
        findExpiredActive: vi.fn(() => Promise.resolve([])),
        deleteMany: vi.fn(() => Promise.resolve()),
    };
    const appSettingsService = { get: vi.fn(() => Promise.resolve(config)) };
    const service = new CleanupService(
        appSettingsService as never,
        {} as never,
        tournamentRepo as never,
    );
    return { service, tournamentRepo, appSettingsService };
}

describe('CleanupService', () => {
    it('reads the setting on each run and applies the enabled rules only', async () => {
        const { service, tournamentRepo, appSettingsService } = makeService({
            ...DEFAULT_CLEANUP_CONFIG,
            completed: { enabled: true, retentionDays: 30 },
            draft: { enabled: false, retentionDays: 7, maxFutureDays: 365 },
        });

        await service.runCleanup();

        expect(appSettingsService.get).toHaveBeenCalledWith('tournament_cleanup');
        expect(tournamentRepo.findExpiredCompleted).toHaveBeenCalledWith(30);
        expect(tournamentRepo.findExpiredDrafts).not.toHaveBeenCalled();
        expect(tournamentRepo.findExpiredActive).toHaveBeenCalledWith(7);
        expect(tournamentRepo.deleteMany).toHaveBeenCalledWith(['t1']);
    });
});
