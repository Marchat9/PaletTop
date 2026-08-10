import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';

export interface SuperAdminTournamentSummaryDto {
  id: string;
  code: string;
  name: string;
  status: TournamentStatus;
  date: string;
  teamsCount: number;
  createdAt: string;
}

export interface PaginatedDto<T> {
  items: T[];
  total: number;
}

export interface SuperAdminTournamentSearchParams {
  password: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: TournamentStatus;
  sortBy?: 'name' | 'code' | 'status' | 'date' | 'createdAt';
  sortDir?: 'ASC' | 'DESC';
}

@Injectable({ providedIn: 'root' })
export class SuperAdminTournamentService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  public search(
    params: SuperAdminTournamentSearchParams,
  ): Observable<PaginatedDto<SuperAdminTournamentSummaryDto>> {
    return this.http.post<PaginatedDto<SuperAdminTournamentSummaryDto>>(
      `${this.apiBaseUrl}/super-admin/tournaments/search`,
      params,
    );
  }

  public detail(id: string, password: string): Observable<TournamentDto> {
    return this.http.post<TournamentDto>(
      `${this.apiBaseUrl}/super-admin/tournaments/${id}/detail`,
      { password },
    );
  }

  public delete(ids: string[], password: string): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/super-admin/tournaments/delete`, {
      password,
      ids,
    });
  }

  public changeStatus(ids: string[], status: TournamentStatus, password: string): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/super-admin/tournaments/status`, {
      password,
      ids,
      status,
    });
  }

  public resetPassword(id: string, newPassword: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/super-admin/tournaments/${id}/password`, {
      password,
      newPassword,
    });
  }
}
