import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface MetricsDto {
  tournaments: {
    total: number;
    draft: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  clubs: {
    total: number;
  };
}

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  public getMetrics(): Observable<MetricsDto> {
    return this.http.get<MetricsDto>(`${this.apiBaseUrl}/metrics`);
  }
}
