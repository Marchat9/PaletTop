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
  selectMatchAwaitingResync,
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
import { By } from '@angular/platform-browser';
import { PlayerTeamDto } from 'src/app/models/team.model';
import { MatchesSessionDto, SessionStatus } from 'src/app/models/matches-session.model';
import { Button } from 'src/app/shared/button/button';
import { PlayerParcours } from 'src/app/shared/player-parcours/player-parcours';
import { PlayerTeamMatchPageComponent } from './player-team-match-page';

function buildTournament(): TournamentDto {
  return {
    id: 't1',
    code: 'ABCD',
    name: 'Tournoi Test',
    date: new Date(),
    configuration: {
      maxTeamCapacity: 16,
      scoreCalculation: 'victory_goal_average',
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

function buildTeam(overrides: Partial<PlayerTeamDto> = {}): PlayerTeamDto {
  return {
    id: 'team-1',
    name: 'Fer et Fier',
    code: 'AB12',
    players: [],
    eliminatedAfterQualifying: false,
    ...overrides,
  };
}

interface SetupOptions {
  team?: PlayerTeamDto | null;
  sessions?: MatchesSessionDto[];
}

function setup(
  awaitingResync = false,
  pathCode = 'ABCD',
  { team = null, sessions = [] }: SetupOptions = {},
) {
  const activatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'teamCode' ? 'AB12' : pathCode),
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
          { selector: selectTeamData, value: team },
          { selector: selectCurrentMatch, value: null },
          { selector: selectSessions, value: sessions },
          { selector: selectTeamIsLoading, value: false },
          { selector: selectStartMatchLoading, value: false },
          { selector: selectValidateMatchLoading, value: false },
          { selector: selectStartMatchError, value: null },
          { selector: selectValidateMatchError, value: null },
          { selector: selectUpdateScoreError, value: null },
          { selector: selectTeamError, value: null },
          { selector: selectMatchAwaitingResync, value: awaitingResync },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(PlayerTeamMatchPageComponent);
  const store = TestBed.inject(MockStore);
  return { fixture, store, actions$, routerMock };
}

describe('PlayerTeamMatchPageComponent', () => {
  it('uses the tournament code in uppercase when the link has it in lowercase', () => {
    const { fixture, store, actions$ } = setup(false, 'abcd');
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    actions$.next(resyncRequested());

    expect(dispatchSpy).toHaveBeenCalledWith(
      loadTournamentInformation({ tournamentCode: 'ABCD', teamCode: 'AB12' }),
    );
    expect(dispatchSpy).toHaveBeenCalledWith(loadSessions({ code: 'ABCD' }));
  });

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

  it('reloads on entry when a resync was signalled while the player was on another page', () => {
    const dispatchSpy = vi.spyOn(MockStore.prototype, 'dispatch');
    setup(true);

    expect(dispatchSpy).toHaveBeenCalledWith(
      loadTournamentInformation({ tournamentCode: 'ABCD', teamCode: 'AB12' }),
    );
    expect(dispatchSpy).toHaveBeenCalledWith(loadSessions({ code: 'ABCD' }));
    dispatchSpy.mockRestore();
  });

  it('does not reload on entry when no resync is pending', () => {
    const dispatchSpy = vi.spyOn(MockStore.prototype, 'dispatch');
    setup(false);

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      loadTournamentInformation({ tournamentCode: 'ABCD', teamCode: 'AB12' }),
    );
    dispatchSpy.mockRestore();
  });

  describe('structured tournament', () => {
    const text = (fixture: { nativeElement: unknown }): string =>
      ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

    it('shows « Mon parcours » from the rounds the team played', () => {
      const { fixture } = setup(false, 'ABCD', {
        team: buildTeam(),
        sessions: [
          {
            id: 's1',
            sessionNumber: 1,
            status: SessionStatus.CLOSED,
            isDrawnRound: false,
            matches: [
              {
                id: 'm1',
                status: 'VALIDATED',
                isBye: false,
                scoreA: 11,
                scoreB: 4,
                plateNumber: 1,
                teamA: { id: 'team-1', name: 'Fer et Fier' },
                teamB: { id: 'team-2', name: 'Les Mouettes' },
                poolNumber: null,
                group: null,
                startedAt: null,
                finishedAt: null,
                duration: null,
              },
            ],
          },
        ],
      });
      fixture.detectChanges();

      const parcours = fixture.debugElement.query(By.directive(PlayerParcours))
        .componentInstance as PlayerParcours;
      expect(parcours.steps().map((step) => step.text)).toEqual(['Qualifs : 1 victoire']);
    });

    it('tells a team stopped after the qualifiers, who can follow the tournament as a spectator', () => {
      const { fixture, routerMock } = setup(false, 'ABCD', {
        team: buildTeam({ eliminatedAfterQualifying: true }),
      });
      fixture.detectChanges();

      expect(fixture.componentInstance.teamMatchStatus()).toBe('ELIMINATED_QUALIFYING');
      expect(text(fixture)).toContain('Éliminé après les qualifs');

      const follow = fixture.debugElement
        .queryAll(By.directive(Button))
        .find((button) => (button.componentInstance as Button).title() === 'Suivre le tournoi');
      expect(follow).toBeDefined();
      (follow!.componentInstance as Button).clicked.emit(new Event('click'));

      expect(routerMock.navigate).toHaveBeenCalledWith(['/spectateur', 'ABCD']);
    });
  });
});
