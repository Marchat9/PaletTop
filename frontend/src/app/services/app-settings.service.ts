import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  AppSettingDetailDto,
  AppSettingKey,
  PublicAppSettingDto,
} from '../models/app-setting.model';

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  public getPublic(): Observable<PublicAppSettingDto[]> {
    return this.http.get<PublicAppSettingDto[]>(`${this.apiBaseUrl}/app-settings`);
  }

  /** Every setting with its audit fields (the super-admin password travels in the body). */
  public getAll(password: string): Observable<AppSettingDetailDto[]> {
    return this.http.post<AppSettingDetailDto[]>(
      `${this.apiBaseUrl}/super-admin/app-settings/list`,
      { password },
    );
  }

  public update(
    key: AppSettingKey,
    value: unknown,
    password: string,
  ): Observable<AppSettingDetailDto> {
    return this.http.put<AppSettingDetailDto>(
      `${this.apiBaseUrl}/super-admin/app-settings/${key}`,
      {
        password,
        value,
      },
    );
  }

  public reset(key: AppSettingKey, password: string): Observable<AppSettingDetailDto> {
    return this.http.post<AppSettingDetailDto>(
      `${this.apiBaseUrl}/super-admin/app-settings/${key}/reset`,
      { password },
    );
  }
}
