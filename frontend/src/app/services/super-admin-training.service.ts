import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PaginatedDto } from 'src/app/services/super-admin-tournament.service';
import {
  AdminTrainingDto,
  TrainingSessionSummaryDto,
} from 'src/app/store/training/training.models';

export interface SuperAdminTrainingSummaryDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  sessionsCount: number;
  openSessionsCount: number;
  createdAt: string;
}

export interface SuperAdminTrainingDetailDto extends AdminTrainingDto {
  sessions: TrainingSessionSummaryDto[];
}

export interface SuperAdminTrainingSearchParams {
  password: string;
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: 'name' | 'code' | 'createdAt' | 'sessionsCount' | 'openSessionsCount';
  sortDir?: 'ASC' | 'DESC';
}

@Injectable({ providedIn: 'root' })
export class SuperAdminTrainingService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  public search(
    params: SuperAdminTrainingSearchParams,
  ): Observable<PaginatedDto<SuperAdminTrainingSummaryDto>> {
    return this.http.post<PaginatedDto<SuperAdminTrainingSummaryDto>>(
      `${this.apiBaseUrl}/super-admin/trainings/search`,
      params,
    );
  }

  public detail(id: string, password: string): Observable<SuperAdminTrainingDetailDto> {
    return this.http.post<SuperAdminTrainingDetailDto>(
      `${this.apiBaseUrl}/super-admin/trainings/${id}/detail`,
      { password },
    );
  }

  public delete(ids: string[], password: string): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/super-admin/trainings/delete`, {
      password,
      ids,
    });
  }

  public resetPassword(id: string, newPassword: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/super-admin/trainings/${id}/password`, {
      password,
      newPassword,
    });
  }
}
