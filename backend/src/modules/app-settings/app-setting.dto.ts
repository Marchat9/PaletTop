import { AppSettingKey, AppSettingScope, AppSettingSource } from 'src/enum/app-setting.enum';

export interface PublicAppSettingDto {
    key: AppSettingKey;
    value: unknown;
}

export interface AppSettingDetailDto extends PublicAppSettingDto {
    scope: AppSettingScope;
    source: AppSettingSource;
    sourceDetail: string | null;
    appVersion: string | null;
    /** Null when the setting is not stored yet (value resolved from the env or the default). */
    updatedAt: Date | null;
}
