import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataSource } from 'typeorm';
import { DevBddExtensionsInitializer } from './dev-bdd-extensions.initializer';

function initializerWith(query: ReturnType<typeof vi.fn>): DevBddExtensionsInitializer {
    return new DevBddExtensionsInitializer({ query } as unknown as DataSource);
}

describe('DevBddExtensionsInitializer', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('creates the unaccent extension in the dev-bdd mode, which runs no migration', async () => {
        vi.stubEnv('APP_ENV', 'dev-bdd');
        const query = vi.fn().mockResolvedValue([]);

        await initializerWith(query).onModuleInit();

        expect(query).toHaveBeenCalledWith('CREATE EXTENSION IF NOT EXISTS unaccent;');
    });

    it('leaves the extensions to the migrations in the normal mode', async () => {
        vi.stubEnv('APP_ENV', 'dev');
        const query = vi.fn();

        await initializerWith(query).onModuleInit();

        expect(query).not.toHaveBeenCalled();
    });
});
