import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('data-source (TypeORM CLI entry point)', () => {
    const originalEnv = { ...process.env };
    let dir: string | undefined;

    afterEach(() => {
        process.env = { ...originalEnv };
        if (dir) rmSync(dir, { recursive: true, force: true });
        vi.resetModules();
    });

    // The CLI migrations (npm run migration:run) must read the same .env as the app, otherwise the
    // admin password migration would hash with the dev pepper instead of the configured one.
    it('loads the .env file before the migrations read PASSWORD_PEPPER', async () => {
        dir = mkdtempSync(join(tmpdir(), 'palettop-env-'));
        const envFile = join(dir, '.env');
        writeFileSync(envFile, `PASSWORD_PEPPER=${'e'.repeat(44)}\n`);
        delete process.env.PASSWORD_PEPPER;
        process.env.DOTENV_CONFIG_PATH = envFile;

        await import('./data-source');

        expect(process.env.PASSWORD_PEPPER).toBe('e'.repeat(44));
    });
});
