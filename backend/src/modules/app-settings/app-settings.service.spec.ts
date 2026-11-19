import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AppSetting } from 'src/entities/app-setting.entity';
import { AppSettingKey, AppSettingScope, AppSettingSource } from 'src/enum/app-setting.enum';
import { DEFAULT_SCORE_CALCULATIONS_BY_MODE } from './app-setting.definitions';
import { AppSettingsService, stableStringify } from './app-settings.service';

const ENV_KEYS = [
    'APP_VERSION',
    'APP_SETTING_SCORE_CALCULATIONS_BY_MODE',
    'TRAINING_LEVEL_HISTORY_DEPTH',
    'TRAINING_CLEANUP_RETENTION_DAYS',
];

/** In-memory stand-in for the TypeORM repository. */
function makeRepo(initial: Partial<AppSetting>[] = []) {
    const rows = new Map<string, AppSetting>(
        initial.map((row) => [row.key!, { updatedAt: new Date(), ...row } as AppSetting]),
    );
    return {
        rows,
        find: vi.fn(() => Promise.resolve([...rows.values()])),
        findOneBy: vi.fn(({ key }: { key: string }) => Promise.resolve(rows.get(key) ?? null)),
        save: vi.fn((row: Partial<AppSetting>) => {
            const saved = { ...rows.get(row.key!), ...row, updatedAt: new Date() } as AppSetting;
            rows.set(saved.key, saved);
            return Promise.resolve(saved);
        }),
    };
}

function makeService(initial: Partial<AppSetting>[] = []) {
    const repo = makeRepo(initial);
    return { repo, service: new AppSettingsService(repo as never) };
}

const scoreKey = AppSettingKey.SCORE_CALCULATIONS_BY_MODE;
const depthKey = AppSettingKey.TRAINING_LEVEL_HISTORY_DEPTH;

describe('AppSettingsService', () => {
    const saved: Record<string, string | undefined> = {};

    beforeEach(() => {
        for (const key of ENV_KEYS) {
            saved[key] = process.env[key];
            delete process.env[key];
        }
    });

    afterEach(() => {
        for (const key of ENV_KEYS) {
            if (saved[key] === undefined) delete process.env[key];
            else process.env[key] = saved[key];
        }
    });

    describe('initialize', () => {
        it('creates every missing setting with its default', async () => {
            process.env.APP_VERSION = '1.2.3';
            const { service, repo } = makeService();

            await service.initialize();

            expect(repo.rows.size).toBe(Object.values(AppSettingKey).length);
            expect(repo.rows.get(scoreKey)).toMatchObject({
                value: DEFAULT_SCORE_CALCULATIONS_BY_MODE,
                scope: AppSettingScope.PUBLIC,
                source: AppSettingSource.APP_DEFAULT,
                sourceDetail: null,
                appVersion: '1.2.3',
            });
        });

        it('initialises from the env vars when they are set', async () => {
            process.env.TRAINING_CLEANUP_RETENTION_DAYS = '30';
            const { service, repo } = makeService();

            await service.initialize();

            expect(repo.rows.get(AppSettingKey.TRAINING_CLEANUP)).toMatchObject({
                value: { enabled: true, cronExpression: '0 6 * * 1', retentionDays: 30 },
                source: AppSettingSource.ENV,
                sourceDetail: 'TRAINING_CLEANUP_RETENTION_DAYS',
            });
        });

        it('follows a changed env var when the stored value came from the env', async () => {
            process.env.TRAINING_LEVEL_HISTORY_DEPTH = '8';
            const { service, repo } = makeService([
                {
                    key: depthKey,
                    value: 3,
                    scope: AppSettingScope.INTERNAL,
                    source: AppSettingSource.ENV,
                },
            ]);

            await service.initialize();

            expect(repo.rows.get(depthKey)?.value).toBe(8);
        });

        it('keeps a super-admin value over the env var', async () => {
            process.env.TRAINING_LEVEL_HISTORY_DEPTH = '8';
            const { service, repo } = makeService([
                {
                    key: depthKey,
                    value: 2,
                    scope: AppSettingScope.INTERNAL,
                    source: AppSettingSource.SUPER_ADMIN,
                },
            ]);

            await service.initialize();

            expect(repo.rows.get(depthKey)).toMatchObject({
                value: 2,
                source: AppSettingSource.SUPER_ADMIN,
            });
        });

        it('ignores an invalid env var', async () => {
            process.env.APP_SETTING_SCORE_CALCULATIONS_BY_MODE = '{"standard":[]}';
            const { service, repo } = makeService();

            await service.initialize();

            expect(repo.rows.get(scoreKey)?.source).toBe(AppSettingSource.APP_DEFAULT);
        });

        it('replaces an invalid stored value and syncs the scope from the code', async () => {
            const { service, repo } = makeService([
                {
                    key: depthKey,
                    value: 'deep',
                    scope: AppSettingScope.PUBLIC,
                    source: AppSettingSource.SUPER_ADMIN,
                },
            ]);

            await service.initialize();

            expect(repo.rows.get(depthKey)).toMatchObject({
                value: 5,
                scope: AppSettingScope.INTERNAL,
                source: AppSettingSource.APP_DEFAULT,
            });
        });

        it('leaves unknown keys untouched', async () => {
            const { service, repo } = makeService([
                {
                    key: 'old_key',
                    value: 1,
                    scope: AppSettingScope.INTERNAL,
                    source: AppSettingSource.SUPER_ADMIN,
                },
            ]);

            await service.initialize();

            expect(repo.rows.get('old_key')?.value).toBe(1);
        });
    });

    describe('get', () => {
        it('falls back to the env value, then to the default, when nothing is stored', async () => {
            const { service } = makeService();
            expect(await service.get(depthKey)).toBe(5);

            process.env.TRAINING_LEVEL_HISTORY_DEPTH = '1';
            expect(await service.get(depthKey)).toBe(1);
        });

        it('returns the stored value', async () => {
            const { service } = makeService([
                {
                    key: depthKey,
                    value: 0,
                    scope: AppSettingScope.INTERNAL,
                    source: AppSettingSource.SUPER_ADMIN,
                },
            ]);
            expect(await service.get(depthKey)).toBe(0);
        });
    });

    describe('findPublic / findAll', () => {
        it('returns only the public settings to everyone', async () => {
            const { service } = makeService();
            await service.initialize();

            const publicSettings = await service.findPublic();

            expect(publicSettings.map((s) => s.key)).toEqual([scoreKey]);
            expect(Object.keys(publicSettings[0])).toEqual(['key', 'value']);
        });

        it('returns every setting with its audit fields to the super-admin', async () => {
            const { service } = makeService();

            const all = await service.findAll();

            expect(all).toHaveLength(Object.values(AppSettingKey).length);
            expect(all.find((s) => s.key === depthKey)).toMatchObject({
                scope: AppSettingScope.INTERNAL,
                source: AppSettingSource.APP_DEFAULT,
                updatedAt: null,
            });
        });
    });

    describe('update / reset / watch', () => {
        it('stores a valid value as a super-admin change and notifies the watchers', async () => {
            const { service, repo } = makeService();
            const listener = vi.fn();
            service.watch(depthKey, listener);

            await service.update(depthKey, 2);

            expect(repo.rows.get(depthKey)).toMatchObject({
                value: 2,
                source: AppSettingSource.SUPER_ADMIN,
                sourceDetail: null,
            });
            expect(listener).toHaveBeenCalledWith(2);
        });

        it('only notifies the watchers of the changed key', async () => {
            const { service } = makeService();
            const listener = vi.fn();
            service.watch(scoreKey, listener);

            await service.update(depthKey, 2);

            expect(listener).not.toHaveBeenCalled();
        });

        it('rejects an invalid value', async () => {
            const { service, repo } = makeService();

            await expect(service.update(depthKey, -2)).rejects.toThrow(BadRequestException);
            expect(repo.save).not.toHaveBeenCalled();
        });

        it('resets to the env value when set, else to the default', async () => {
            const { service, repo } = makeService();
            await service.update(depthKey, 2);

            await service.reset(depthKey);
            expect(repo.rows.get(depthKey)).toMatchObject({
                value: 5,
                source: AppSettingSource.APP_DEFAULT,
            });

            process.env.TRAINING_LEVEL_HISTORY_DEPTH = '7';
            const listener = vi.fn();
            service.watch(depthKey, listener);
            await service.reset(depthKey);
            expect(repo.rows.get(depthKey)).toMatchObject({
                value: 7,
                source: AppSettingSource.ENV,
                sourceDetail: 'TRAINING_LEVEL_HISTORY_DEPTH',
            });
            expect(listener).toHaveBeenCalledWith(7);
        });
    });
});

describe('stableStringify', () => {
    it('ignores the key order', () => {
        expect(stableStringify({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(
            stableStringify({ a: [{ c: 3, d: 2 }], b: 1 }),
        );
    });
});
