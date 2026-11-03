import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { resyncRequested } from 'src/app/store/realtime/realtime.actions';
import { selectAdminUpdateScoreLoading } from 'src/app/store/match/match.selectors';
import { selectRanking, selectRankingIsLoading } from 'src/app/store/ranking/ranking.selectors';
import { selectSessions } from 'src/app/store/session/session.selectors';
import { connectTournamentAdministrator } from 'src/app/store/tournament/tournament.admin.actions';
import {
  selectCompleteTournamentLoading,
  selectCurrentTournamentAdminInformations,
  selectCurrentTournamentData,
  selectCurrentTournamentIsAdminView,
  selectCurrentTournamentIsLoading,
  selectNextSessionLoading,
  selectStartTournamentLoading,
  selectTournamentUpdateConfigLoading,
} from 'src/app/store/tournament/tournament.selectors';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { AdminTournamentPageComponent } from './admin-tournament-page.component';

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

function setup({ isAdminView = true } = {}) {
  const activatedRoute = {
    paramMap: of(convertToParamMap({ tournamentCode: 'ABCD' })),
  } as unknown as ActivatedRoute;
  const routerMock = { navigate: vi.fn() };
  const dialogMock = { open: vi.fn() };
  const actions$ = new Subject<Action>();

  TestBed.configureTestingModule({
    imports: [AdminTournamentPageComponent],
    providers: [
      { provide: ActivatedRoute, useValue: activatedRoute },
      { provide: Router, useValue: routerMock },
      { provide: Dialog, useValue: dialogMock },
      { provide: Actions, useValue: actions$ },
      provideMockStore({
        selectors: [
          { selector: selectCurrentTournamentData, value: buildTournament() },
          {
            selector: selectCurrentTournamentAdminInformations,
            value: { code: 'ABCD', password: 'secret' },
          },
          { selector: selectCurrentTournamentIsLoading, value: false },
          { selector: selectCurrentTournamentIsAdminView, value: isAdminView },
          { selector: selectCompleteTournamentLoading, value: false },
          { selector: selectTournamentUpdateConfigLoading, value: false },
          { selector: selectStartTournamentLoading, value: false },
          { selector: selectNextSessionLoading, value: false },
          { selector: selectAdminUpdateScoreLoading, value: false },
          { selector: selectRankingIsLoading, value: false },
          { selector: selectSessions, value: [] },
          { selector: selectRanking, value: [] },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(AdminTournamentPageComponent);
  const store = TestBed.inject(MockStore);
  return { fixture, store, actions$ };
}

describe('AdminTournamentPageComponent', () => {
  it('re-fetches the tournament as admin when a resync is requested', () => {
    const { fixture, store, actions$ } = setup();
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    actions$.next(resyncRequested());

    expect(dispatchSpy).toHaveBeenCalledWith(
      connectTournamentAdministrator({ code: 'ABCD', password: 'secret' }),
    );
  });

  it('does not reconnect when the admin view of this tournament is already loaded', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.detectChanges();

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      connectTournamentAdministrator({ code: 'ABCD', password: 'secret' }),
    );
  });

  // Admin who also plays: the player view of the same tournament only has their own team code.
  it('fetches the admin view when only the player view of this tournament is loaded', () => {
    const { fixture, store } = setup({ isAdminView: false });
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(
      connectTournamentAdministrator({ code: 'ABCD', password: 'secret' }),
    );
  });
});
