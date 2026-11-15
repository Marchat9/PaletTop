import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { VersionController } from './version.controller';

function controller(appVersion: string | undefined): VersionController {
    return new VersionController({ get: () => appVersion } as unknown as ConfigService);
}

describe('VersionController', () => {
    it('returns the version the release was built with', () => {
        expect(controller('1.4.2').getVersion()).toEqual({ version: '1.4.2' });
    });

    it('falls back to the placeholder of local builds when no version is set', () => {
        expect(controller(undefined).getVersion()).toEqual({ version: '0.0.0' });
        expect(controller('').getVersion()).toEqual({ version: '0.0.0' });
    });
});
