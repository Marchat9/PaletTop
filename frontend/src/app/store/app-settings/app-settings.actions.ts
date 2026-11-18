import { createAction, props } from '@ngrx/store';
import {
  AppSettingDetailDto,
  AppSettingKey,
  PublicAppSettingDto,
} from 'src/app/models/app-setting.model';

export const loadPublicSettings = createAction('[App Settings] Load Public');
export const loadPublicSettingsSuccess = createAction(
  '[App Settings] Load Public Success',
  props<{ settings: PublicAppSettingDto[] }>(),
);
export const loadPublicSettingsFailure = createAction(
  '[App Settings] Load Public Failure',
  props<{ error: string }>(),
);

export const loadSuperAdminSettings = createAction('[App Settings] Load Super Admin');
export const loadSuperAdminSettingsSuccess = createAction(
  '[App Settings] Load Super Admin Success',
  props<{ settings: AppSettingDetailDto[] }>(),
);
export const loadSuperAdminSettingsFailure = createAction(
  '[App Settings] Load Super Admin Failure',
  props<{ error: string }>(),
);

export const updateSetting = createAction(
  '[App Settings] Update',
  props<{ key: AppSettingKey; value: unknown }>(),
);
export const resetSetting = createAction('[App Settings] Reset', props<{ key: AppSettingKey }>());
export const saveSettingSuccess = createAction(
  '[App Settings] Save Success',
  props<{ setting: AppSettingDetailDto; isReset: boolean }>(),
);
export const saveSettingFailure = createAction(
  '[App Settings] Save Failure',
  props<{ key: AppSettingKey; error: string }>(),
);
