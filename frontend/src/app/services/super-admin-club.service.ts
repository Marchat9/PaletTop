import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PaginatedDto } from './super-admin-tournament.service';

export interface SuperAdminClubSummaryDto {
  id: string;
  name: string;
  playersCount: number;
}

export interface SuperAdminClubSearchParams {
  password: string;
  page: number;
  pageSize: number;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class SuperAdminClubService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  public search(
    params: SuperAdminClubSearchParams,
  ): Observable<PaginatedDto<SuperAdminClubSummaryDto>> {
    return this.http.post<PaginatedDto<SuperAdminClubSummaryDto>>(
      `${this.apiBaseUrl}/super-admin/clubs/search`,
      params,
    );
  }

  public rename(id: string, name: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/super-admin/clubs/${id}/rename`, {
      password,
      name,
    });
  }

  public delete(ids: string[], password: string): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/super-admin/clubs/delete`, { password, ids });
  }
}
