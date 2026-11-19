import { Controller, Get } from '@nestjs/common';
import { PublicAppSettingDto } from './app-setting.dto';
import { AppSettingsService } from './app-settings.service';

/** Public settings, read by every page of the app (no authentication). */
@Controller('app-settings')
export class AppSettingsController {
    constructor(private readonly appSettingsService: AppSettingsService) {}

    @Get()
    findPublic(): Promise<PublicAppSettingDto[]> {
        return this.appSettingsService.findPublic();
    }
}
