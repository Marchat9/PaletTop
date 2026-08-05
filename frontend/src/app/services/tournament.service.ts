import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TournamentConfigurationDto } from 'src/app/models/tournament-configuration.model';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { environment } from 'src/environments/environment';
import { TeamConfigCreateTeamPayload } from '../models/team-config.model';
import { TournamentConfigurationDetailsDto } from '../models/tournament-configuration-detail.model';

@Injectable({
  providedIn: 'root',
})
export class TournamentService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  public createTournament(config: TournamentConfigurationDto): Observable<TournamentDto> {
    return this.http.post<TournamentDto>(`${this.apiBaseUrl}/tournaments`, config);
  }

  public getAdminTournament(code: string, password: string): Observable<TournamentDto> {
    return this.http.post<TournamentDto>(`${this.apiBaseUrl}/tournaments/admin-access`, {
      code,
      password,
    });
  }

  public joinTournamentAsPlayer(
    tournamentCode: string,
    teamCode: string,
  ): Observable<TournamentDto> {
    return this.http.post<TournamentDto>(`${this.apiBaseUrl}/tournaments/join`, {
      tournamentCode,
      teamCode,
    });
  }

  public updateTournamentConfiguration(
    idTournament: string,
    tournament: TournamentConfigurationDto,
    password: string,
  ): Observable<TournamentDto> {
    const { adminPassword, ...rest } = tournament;

    return this.http.patch<TournamentDto>(
      `${this.apiBaseUrl}/tournaments/${idTournament}/configuration`,
      { password, ...rest },
    );
  }

  public addTeamsToTournament(
    tournamentCode: string,
    teams: TeamConfigCreateTeamPayload[],
    password: string,
  ): Observable<TournamentDto> {
    return this.http.post<TournamentDto>(`${this.apiBaseUrl}/tournaments/${tournamentCode}/teams`, {
      password,
      teams: teams,
    });
  }

  public startTournament(code: string, password: string): Observable<TournamentDto> {
    return this.http.post<TournamentDto>(`${this.apiBaseUrl}/tournaments/${code}/start`, {
      password,
    });
  }

  public nextSession(code: string, password: string): Observable<TournamentDto> {
    return this.http.post<TournamentDto>(
      `${this.apiBaseUrl}/tournaments/${code}/matches/next-session`,
      { password },
    );
  }

  public completeTournament(code: string, password: string): Observable<TournamentDto> {
    return this.http.post<TournamentDto>(`${this.apiBaseUrl}/tournaments/${code}/complete`, {
      password,
    });
  }
}
