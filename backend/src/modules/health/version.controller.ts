import { Controller, Get, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Placeholder of local and PR builds, where no release tag gives a version. */
export const DEFAULT_APP_VERSION = '0.0.0';

export interface AppVersionDto {
    version: string;
}

/**
 * Version of the deployed release. Front and back images are built together from the same tag,
 * so the frontend compares it with its own to detect a stale cached app (PWA included).
 */
@Controller('version')
export class VersionController {
    private readonly logger = new Logger(VersionController.name);
    private readonly version: string;

    constructor(configService: ConfigService) {
        this.version = configService.get<string>('APP_VERSION') || DEFAULT_APP_VERSION;
        this.logger.log(`Serving app version ${this.version}`);
    }

    @Get()
    getVersion(): AppVersionDto {
        return { version: this.version };
    }
}
