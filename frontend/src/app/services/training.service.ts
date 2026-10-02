import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  AdminTrainingDto,
  TrainingCurrentMatchDto,
  TrainingLeaderboardEntryDto,
  TrainingMatchDto,
  TrainingRoundDto,
  TrainingSessionAdminDto,
  TrainingSessionConfigurationDto,
  TrainingSessionPublicDto,
  TrainingSessionSummaryDto,
} from 'src/app/store/training/training.models';

@Injectable({
  providedIn: 'root',
})
export class TrainingService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  // ---------------- Training (roster) ----------------
  public createTraining(
    code: string,
    name: string,
    description: string | undefined,
    adminPassword: string,
  ): Observable<AdminTrainingDto> {
    return this.http.post<AdminTrainingDto>(`${this.apiBaseUrl}/trainings`, {
      code,
      name,
      description,
      adminPassword,
    });
  }

  public getAdminTraining(code: string, password: string): Observable<AdminTrainingDto> {
    return this.http.post<AdminTrainingDto>(`${this.apiBaseUrl}/trainings/admin-access`, {
      code,
      password,
    });
  }

  public updateTraining(
    code: string,
    password: string,
    name?: string,
    description?: string,
  ): Observable<AdminTrainingDto> {
    return this.http.patch<AdminTrainingDto>(
      `${this.apiBaseUrl}/trainings/${encodeURIComponent(code)}`,
      {
        password,
        name,
        description,
      },
    );
  }

  public addMember(code: string, password: string, name: string): Observable<AdminTrainingDto> {
    return this.http.post<AdminTrainingDto>(
      `${this.apiBaseUrl}/trainings/${encodeURIComponent(code)}/members`,
      {
        password,
        name,
      },
    );
  }

  public removeMember(
    code: string,
    memberId: string,
    password: string,
  ): Observable<AdminTrainingDto> {
    return this.http.delete<AdminTrainingDto>(
      `${this.apiBaseUrl}/trainings/${encodeURIComponent(code)}/members/${memberId}`,
      { body: { password } },
    );
  }

  // ---------------- Sessions ----------------
  public createSession(
    trainingCode: string,
    password: string,
    configuration: TrainingSessionConfigurationDto,
  ): Observable<TrainingSessionAdminDto> {
    return this.http.post<TrainingSessionAdminDto>(
      `${this.apiBaseUrl}/trainings/${encodeURIComponent(trainingCode)}/sessions`,
      { password, ...configuration },
    );
  }

  public listSessions(
    trainingCode: string,
    password: string,
  ): Observable<TrainingSessionSummaryDto[]> {
    return this.http.post<TrainingSessionSummaryDto[]>(
      `${this.apiBaseUrl}/trainings/${encodeURIComponent(trainingCode)}/sessions/list`,
      { password },
    );
  }

  public getSessionPublic(sessionCode: string): Observable<TrainingSessionPublicDto> {
    return this.http.get<TrainingSessionPublicDto>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}`,
    );
  }

  public getSessionAdmin(
    sessionCode: string,
    password: string,
  ): Observable<TrainingSessionAdminDto> {
    return this.http.post<TrainingSessionAdminDto>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/admin-access`,
      { password },
    );
  }

  public closeSession(sessionCode: string, password: string): Observable<TrainingSessionAdminDto> {
    return this.http.post<TrainingSessionAdminDto>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/close`,
      { password },
    );
  }

  public checkinParticipant(
    sessionCode: string,
    password: string,
    memberId?: string,
    name?: string,
  ): Observable<TrainingSessionAdminDto> {
    return this.http.post<TrainingSessionAdminDto>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/checkin`,
      { password, memberId, name },
    );
  }

  public removeParticipant(
    sessionCode: string,
    participantId: string,
    password: string,
  ): Observable<TrainingSessionAdminDto> {
    return this.http.delete<TrainingSessionAdminDto>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/participants/${participantId}`,
      { body: { password } },
    );
  }

  public getLeaderboard(sessionCode: string): Observable<TrainingLeaderboardEntryDto[]> {
    return this.http.get<TrainingLeaderboardEntryDto[]>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/leaderboard`,
    );
  }

  // ---------------- Teams ----------------
  public createTeam(
    sessionCode: string,
    password: string,
    participantIds: string[],
    name?: string,
  ): Observable<TrainingSessionAdminDto> {
    return this.http.post<TrainingSessionAdminDto>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/teams`,
      { password, participantIds, name },
    );
  }

  public dissolveTeam(
    sessionCode: string,
    teamId: string,
    password: string,
  ): Observable<TrainingSessionAdminDto> {
    return this.http.delete<TrainingSessionAdminDto>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/teams/${teamId}`,
      { body: { password } },
    );
  }

  // ---------------- Rounds ----------------
  public generateRound(sessionCode: string, password: string): Observable<TrainingRoundDto> {
    return this.http.post<TrainingRoundDto>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/rounds`,
      { password },
    );
  }

  public listRounds(sessionCode: string): Observable<TrainingRoundDto[]> {
    return this.http.get<TrainingRoundDto[]>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/rounds`,
    );
  }

  public getRound(sessionCode: string, roundNumber: number): Observable<TrainingRoundDto> {
    return this.http.get<TrainingRoundDto>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/rounds/${roundNumber}`,
    );
  }

  // ---------------- Participant view ----------------
  public getCurrentMatch(
    sessionCode: string,
    participantCode: string,
  ): Observable<TrainingCurrentMatchDto> {
    return this.http.get<TrainingCurrentMatchDto>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/participants/${participantCode}/current-match`,
    );
  }

  public getHistory(sessionCode: string, participantCode: string): Observable<TrainingMatchDto[]> {
    return this.http.get<TrainingMatchDto[]>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/participants/${participantCode}/history`,
    );
  }

  // ---------------- Matches / score ----------------
  public startMatch(
    sessionCode: string,
    matchId: string,
    participantCode: string,
  ): Observable<TrainingMatchDto> {
    return this.http.post<TrainingMatchDto>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/matches/${matchId}/start`,
      { participantCode },
    );
  }

  public updateScore(
    sessionCode: string,
    matchId: string,
    participantCode: string,
    scoreA: number,
    scoreB: number,
  ): Observable<TrainingMatchDto> {
    return this.http.patch<TrainingMatchDto>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/matches/${matchId}/score`,
      { participantCode, scoreA, scoreB },
    );
  }

  public validateMatch(
    sessionCode: string,
    matchId: string,
    participantCode: string,
    opponentParticipantCode: string,
  ): Observable<TrainingMatchDto> {
    return this.http.post<TrainingMatchDto>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/matches/${matchId}/validate`,
      { participantCode, opponentParticipantCode },
    );
  }

  public adminUpdateScore(
    sessionCode: string,
    matchId: string,
    password: string,
    scoreA: number,
    scoreB: number,
  ): Observable<TrainingMatchDto> {
    return this.http.patch<TrainingMatchDto>(
      `${this.apiBaseUrl}/trainings/sessions/${sessionCode}/matches/${matchId}/score/admin`,
      { password, scoreA, scoreB },
    );
  }
}
