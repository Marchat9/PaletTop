import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { selectMatchHistory } from 'src/app/store/match-history/match-history.selectors';
import {
  selectCurrentMatch,
  selectStartMatchError,
  selectStartMatchLoading,
  selectUpdateScoreError,
  selectValidateMatchError,
  selectValidateMatchLoading,
} from 'src/app/store/match/match.selectors';
import { selectRanking } from 'src/app/store/ranking/ranking.selectors';
import { resyncRequested } from 'src/app/store/realtime/realtime.actions';
import { loadSessions } from 'src/app/store/session/session.actions';
import { selectSessions } from 'src/app/store/session/session.selectors';
import {
  selectTeamData,
  selectTeamError,
  selectTeamIsLoading,
} from 'src/app/store/team/team.selectors';
import { loadTournamentInformation } from 'src/app/store/tournament/tournament.actions';
import {
  selectCurrentTournament,
  selectCurrentTournamentData,
} from 'src/app/store/tournament/tournament.selectors';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { PlayerTeamMatchPageComponent } from './player-team-match-page';

function buildTournament(): TournamentDto {
  return {
    id: 't1',
    code: 'ABCD',
    name: 'Tournoi Test',
    date: new Date(),
    configuration: {
      maxTeamCapacity: 16,
      scoreCalculation: 'victory_ga',
      pointsPerGame: 1,
      rematch: false,
      matchAgainstFullSameClub: false,
      matchAgainstPartialSameClub: false,
      competitionMode: 'standard',
      competitionConfiguration: {},
    },
    status: TournamentStatus.ACTIVE,
    teams: [],
    createdAt: new Date().toISOString(),
    tournamentStatus: null,
  };
}

function setup() {
  const activatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'teamCode' ? 'AB12' : 'ABCD'),
      },
    },
  } as unknown as ActivatedRoute;
  const routerMock = { navigate: vi.fn() };
  const dialogMock = { open: vi.fn() };
  const actions$ = new Subject<Action>();

  TestBed.configureTestingModule({
    imports: [PlayerTeamMatchPageComponent],
    providers: [
      { provide: ActivatedRoute, useValue: activatedRoute },
      { provide: Router, useValue: routerMock },
      { provide: Dialog, useValue: dialogMock },
      { provide: Actions, useValue: actions$ },
      provideMockStore({
        selectors: [
          {
            selector: selectCurrentTournament,
            value: { data: buildTournament(), isLoading: false, error: null },
          },
          { selector: selectCurrentTournamentData, value: buildTournament() },
          { selector: selectRanking, value: [] },
          { selector: selectMatchHistory, value: [] },
          { selector: selectTeamData, value: null },
          { selector: selectCurrentMatch, value: null },
          { selector: selectSessions, value: [] },
          { selector: selectTeamIsLoading, value: false },
          { selector: selectStartMatchLoading, value: false },
          { selector: selectValidateMatchLoading, value: false },
          { selector: selectStartMatchError, value: null },
          { selector: selectValidateMatchError, value: null },
          { selector: selectUpdateScoreError, value: null },
          { selector: selectTeamError, value: null },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(PlayerTeamMatchPageComponent);
  const store = TestBed.inject(MockStore);
  return { fixture, store, actions$ };
}

describe('PlayerTeamMatchPageComponent', () => {
  it('reloads the tournament information and sessions when a resync is requested', () => {
    const { fixture, store, actions$ } = setup();
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    actions$.next(resyncRequested());

    expect(dispatchSpy).toHaveBeenCalledWith(
      loadTournamentInformation({ tournamentCode: 'ABCD', teamCode: 'AB12' }),
    );
    expect(dispatchSpy).toHaveBeenCalledWith(loadSessions({ code: 'ABCD' }));
  });
});
