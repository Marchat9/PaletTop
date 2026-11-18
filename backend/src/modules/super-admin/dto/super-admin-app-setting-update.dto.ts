import { IsDefined } from 'class-validator';
import { SuperAdminActionDto } from './super-admin-action.dto';

/** The value is checked against the setting's own rules by `AppSettingsService.update`. */
export class SuperAdminAppSettingUpdateDto extends SuperAdminActionDto {
    @IsDefined()
    value!: unknown;
}
