import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SpectatorTournamentDto } from 'src/app/store/spectator/spectator.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class SpectatorService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  public getTournament(code: string): Observable<SpectatorTournamentDto> {
    return this.http.get<SpectatorTournamentDto>(
      `${this.apiBaseUrl}/tournaments/spectator/${code}`,
    );
  }
}
