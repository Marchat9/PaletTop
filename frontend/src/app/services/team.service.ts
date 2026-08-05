import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DeleteTeamRequest, TeamDto, UpdateTeamRequest } from 'src/app/models/team.model';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  public getTeam(tournamentCode: string, teamCode: string): Observable<TeamDto> {
    return this.http.get<TeamDto>(
      `${this.apiBaseUrl}/tournaments/${tournamentCode}/teams/${teamCode}`,
    );
  }

  public updateTeam(
    tournamentCode: string,
    teamCode: string,
    request: UpdateTeamRequest,
  ): Observable<TeamDto> {
    return this.http.patch<TeamDto>(
      `${this.apiBaseUrl}/tournaments/${tournamentCode}/teams/${teamCode}`,
      request,
    );
  }

  public deleteTeam(
    tournamentCode: string,
    teamCode: string,
    request: DeleteTeamRequest,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiBaseUrl}/tournaments/${tournamentCode}/teams/${teamCode}`,
      { body: request },
    );
  }
}
