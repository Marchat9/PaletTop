import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { AppSettingKey } from 'src/enum/app-setting.enum';
import { isAppSettingKey } from 'src/modules/app-settings/app-setting.definitions';
import { AppSettingDetailDto } from 'src/modules/app-settings/app-setting.dto';
import { AppSettingsService } from 'src/modules/app-settings/app-settings.service';
import { SuperAdminActionDto } from './dto/super-admin-action.dto';
import { SuperAdminAppSettingUpdateDto } from './dto/super-admin-app-setting-update.dto';
import { SuperAdminAuthGuard } from './super-admin-auth.guard';

function toKey(key: string): AppSettingKey {
    if (!isAppSettingKey(key)) {
        throw new NotFoundException(`Paramètre inconnu : « ${key} ».`);
    }
    return key;
}

/**
 * Every setting, whatever its scope: read, edit and reset by the super-admin. All routes carry the
 * super-admin password in the body (read by `SuperAdminAuthGuard`), hence POST for the list.
 */
@Controller('super-admin/app-settings')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminAppSettingsController {
    constructor(private readonly appSettingsService: AppSettingsService) {}

    @Post('list')
    @HttpCode(HttpStatus.OK)
    findAll(@Body() _dto: SuperAdminActionDto): Promise<AppSettingDetailDto[]> {
        return this.appSettingsService.findAll();
    }

    @Put(':key')
    update(
        @Param('key') key: string,
        @Body() dto: SuperAdminAppSettingUpdateDto,
    ): Promise<AppSettingDetailDto> {
        return this.appSettingsService.update(toKey(key), dto.value);
    }

    @Post(':key/reset')
    @HttpCode(HttpStatus.OK)
    reset(
        @Param('key') key: string,
        @Body() _dto: SuperAdminActionDto,
    ): Promise<AppSettingDetailDto> {
        return this.appSettingsService.reset(toKey(key));
    }
}
