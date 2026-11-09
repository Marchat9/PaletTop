import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { Dialog } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore, Store } from '@ngrx/store';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, of, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '@environment';
import { PlayerMatchDto } from 'src/app/models/player-match.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { PlayerTeamMatchPageComponent } from 'src/app/pages/player-team-match-page/player-team-match-page';
import { PlayerTrainingSessionPage } from 'src/app/pages/player-training-session-page/player-training-session-page';
import { AppVisibilityService } from 'src/app/services/app-visibility.service';
import { WebSocketService } from 'src/app/services/websocket.service';
import { effects, reducers } from 'src/app/store/app-store';
import { selectMatchAwaitingResync } from 'src/app/store/match/match.selectors';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { TrainingCurrentMatchDto } from 'src/app/store/training/training.models';
import { selectTrainingParticipantAwaitingResync } from 'src/app/store/training/training.selectors';

/**
 * End to end on the front side: the real store, reducers, effects and player pages; only the
 * server (HTTP), the websocket and the foreground/network signals are simulated, on a fake clock.
 * Checks the score entry lock never stays stuck, never reloads in a loop, and stays short.
 */

const RESYNC_DEBOUNCE = environment.apiConfiguration.mobileResyncDebounce;
const RELOAD_TIMEOUT = environment.apiConfiguration.reloadTimeout;

const TRAINING_MATCH_URL = '/trainings/sessions/1234/participants/4821/current-match';
const TOURNAMENT_JOIN_URL = '/tournaments/join';
const TOURNAMENT_MATCH_URL = '/tournaments/ABCD/teams/AB12/match';

function trainingCurrentMatch(scoreB: number): TrainingCurrentMatchDto {
  return {
    participant: { id: 'p1', name: 'Jean Dubois' },
    roundNumber: 1,
    sitOut: false,
    match: {
      id: 'm1',
      status: 'ONGOING',
      isBye: false,
      scoreA: 4,
      scoreB,
      teamA: { id: 'tA', kind: 'EPHEMERAL', members: [{ id: 'p3', name: 'Luc Béguin' }] },
      teamB: { id: 'tB', kind: 'EPHEMERAL', members: [{ id: 'p1', name: 'Jean Dubois' }] },
    },
  };
}

function tournament(status: TournamentStatus): TournamentDto {
  return {
    id: 't1',
    code: 'ABCD',
    name: 'Tournoi Test',
    date: '2026-01-01T10:00:00.000Z' as unknown as Date,
    configuration: {
      maxTeamCapacity: 16,
      scoreCalculation: 'victory_ga',
      pointsPerGame: 13,
      rematch: false,
      matchAgainstFullSameClub: false,
      matchAgainstPartialSameClub: false,
      competitionMode: 'standard',
      competitionConfiguration: {},
    },
    status,
    teams: [],
    createdAt: '2026-01-01T10:00:00.000Z',
    tournamentStatus: null,
  } as TournamentDto;
}

function playerMatch(): PlayerMatchDto {
  return {
    id: 'm1',
    status: 'ONGOING',
    isBye: false,
    scoreA: 3,
    scoreB: 4,
    plateNumber: 1,
    teamA: { id: 'a', name: 'A' },
    teamB: { id: 'b', name: 'B' },
    startedAt: null,
    finishedAt: null,
    duration: null,
    session: { id: 's1', sessionNumber: 1 },
  };
}

/** Empty but well-formed answer for the side requests of the player pages. */
function sideAnswer(url: string): object {
  if (url.endsWith('/trainings/sessions/1234')) {
    return {
      id: 's1',
      code: '1234',
      date: '2026-01-01T10:00:00.000Z',
      status: 'OPEN',
      playersPerTeam: 2,
      allowedTeamSizes: [2],
      preferTargetTeamSize: false,
      plateCount: 4,
      teamComposition: 'RANDOM',
      avoidSamePartnerConsecutive: true,
      avoidSameOpponentConsecutive: true,
      pointsPerGame: 13,
      createdAt: '2026-01-01T10:00:00.000Z',
      participants: [],
      teams: [],
    };
  }
  if (url.endsWith('/teams/AB12')) {
    return { id: 'b', code: 'AB12', name: 'B', players: [] };
  }
  // History, leaderboard, ranking, sessions: lists.
  return [];
}

function setup() {
  const reconnected$ = new Subject<void>();
  const resumed$ = new Subject<void>();

  TestBed.configureTestingModule({
    providers: [
      provideStore(reducers),
      provideEffects(effects),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: Router, useValue: { navigate: vi.fn(), navigateByUrl: vi.fn() } },
      { provide: Dialog, useValue: { open: vi.fn() } },
      {
        provide: ToastrService,
        useValue: { error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() },
      },
      {
        provide: WebSocketService,
        useValue: {
          reconnected$,
          on: () => EMPTY,
          connect: vi.fn(),
          connectTrainingSession: vi.fn(),
          disconnect: vi.fn(),
        },
      },
      { provide: AppVisibilityService, useValue: { resumed$ } },
      {
        provide: ActivatedRoute,
        useValue: {
          // Training page: observable params. Tournament page: snapshot.
          paramMap: of(convertToParamMap({ sessionCode: '1234', participantCode: '4821' })),
          queryParamMap: of(convertToParamMap({})),
          snapshot: {
            paramMap: convertToParamMap({ tournamentCode: 'ABCD', teamCode: 'AB12' }),
          },
        },
      },
    ],
  });

  const http = TestBed.inject(HttpTestingController);
  const store = TestBed.inject(Store);

  /**
   * Requests still waiting for an answer whose URL ends with `path` (a request superseded by a
   * newer one - switchMap - is cancelled and no longer counts).
   */
  const open = (match: (url: string) => boolean): TestRequest[] =>
    http.match((req) => match(req.url)).filter((req) => !req.cancelled);
  const pending = (path: string) => open((url) => url.endsWith(path));
  /** Answers every request waiting on `path`; returns how many there were. */
  const answer = (path: string, body: object | null) => {
    const requests = pending(path);
    requests.forEach((req) => req.flush(body));
    return requests.length;
  };
  const failNetwork = (path: string) => {
    const requests = pending(path);
    requests.forEach((req) => req.error(new ProgressEvent('error'), { status: 0 }));
    return requests.length;
  };
  /** Side requests of a page (history, leaderboard, ranking...): not under test, answered empty. */
  const answerOthers = (...excluded: string[]) =>
    open((url) => !excluded.some((path) => url.endsWith(path))).forEach((req) =>
      req.flush(sideAnswer(req.request.url)),
    );

  return { http, store, reconnected$, resumed$, pending, answer, failNetwork, answerOthers };
}

function backToForeground(resumed$: Subject<void>): void {
  resumed$.next();
  vi.advanceTimersByTime(RESYNC_DEBOUNCE);
}

describe('Score entry lock around a resync (integration)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  describe('Entraînement', () => {
    function openTrainingPage() {
      const env = setup();
      const fixture: ComponentFixture<PlayerTrainingSessionPage> =
        TestBed.createComponent(PlayerTrainingSessionPage);
      fixture.detectChanges();
      env.answer(TRAINING_MATCH_URL, trainingCurrentMatch(7));
      env.answerOthers(TRAINING_MATCH_URL);
      fixture.detectChanges();
      const locked = () => env.store.selectSignal(selectTrainingParticipantAwaitingResync)();
      return { ...env, fixture, locked };
    }

    it('se déverrouille dès que le match est rechargé, sans autre requête ensuite', () => {
      const { resumed$, answer, answerOthers, pending, locked, fixture } = openTrainingPage();
      expect(locked()).toBe(false);

      resumed$.next();
      expect(locked()).toBe(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.sync-hint')).not.toBeNull();

      vi.advanceTimersByTime(RESYNC_DEBOUNCE);
      expect(answer(TRAINING_MATCH_URL, trainingCurrentMatch(8))).toBe(1);
      answerOthers(TRAINING_MATCH_URL);
      expect(locked()).toBe(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.sync-hint')).toBeNull();

      // No loop: a minute later, nothing has been requested again.
      vi.advanceTimersByTime(60_000);
      expect(pending(TRAINING_MATCH_URL)).toHaveLength(0);
    });

    it('abandonne une requête sans réponse après 15 s et réessaie une fois', () => {
      const { resumed$, answer, answerOthers, pending, locked } = openTrainingPage();

      backToForeground(resumed$);
      answerOthers(TRAINING_MATCH_URL);
      expect(pending(TRAINING_MATCH_URL)).toHaveLength(1);

      vi.advanceTimersByTime(RELOAD_TIMEOUT);
      // The first request was given up, a second one is on its way.
      expect(answer(TRAINING_MATCH_URL, trainingCurrentMatch(8))).toBe(1);
      expect(locked()).toBe(false);
    });

    it('reste verrouillé après deux échecs, sans réessayer à l’infini, puis repart au signal suivant', () => {
      const { resumed$, answer, answerOthers, pending, locked } = openTrainingPage();

      backToForeground(resumed$);
      answerOthers(TRAINING_MATCH_URL);
      vi.advanceTimersByTime(RELOAD_TIMEOUT); // 1st attempt given up
      vi.advanceTimersByTime(RELOAD_TIMEOUT); // retry given up

      expect(locked()).toBe(true);
      vi.advanceTimersByTime(5 * 60_000);
      expect(pending(TRAINING_MATCH_URL)).toHaveLength(0);

      // Network back: the next signal reloads, and the entry is unlocked.
      backToForeground(resumed$);
      answerOthers(TRAINING_MATCH_URL);
      expect(answer(TRAINING_MATCH_URL, trainingCurrentMatch(8))).toBe(1);
      expect(locked()).toBe(false);
    });

    it('réessaie une seule fois une erreur réseau', () => {
      const { resumed$, failNetwork, answerOthers, pending, locked } = openTrainingPage();

      backToForeground(resumed$);
      answerOthers(TRAINING_MATCH_URL);
      expect(failNetwork(TRAINING_MATCH_URL)).toBe(1);
      expect(failNetwork(TRAINING_MATCH_URL)).toBe(1);
      expect(pending(TRAINING_MATCH_URL)).toHaveLength(0);
      expect(locked()).toBe(true);
    });

    it('regroupe une rafale de signaux en un seul rechargement', () => {
      const { resumed$, reconnected$, pending, answerOthers } = openTrainingPage();

      resumed$.next();
      vi.advanceTimersByTime(300);
      reconnected$.next();
      vi.advanceTimersByTime(300);
      resumed$.next();
      vi.advanceTimersByTime(RESYNC_DEBOUNCE);
      answerOthers(TRAINING_MATCH_URL);

      expect(pending(TRAINING_MATCH_URL)).toHaveLength(1);
    });
  });

  describe('Tournoi', () => {
    function openTournamentPage(status = TournamentStatus.ACTIVE) {
      const env = setup();
      const fixture: ComponentFixture<PlayerTeamMatchPageComponent> = TestBed.createComponent(
        PlayerTeamMatchPageComponent,
      );
      fixture.detectChanges();
      env.answer(TOURNAMENT_JOIN_URL, tournament(status));
      env.answer(TOURNAMENT_MATCH_URL, playerMatch());
      env.answerOthers(TOURNAMENT_JOIN_URL, TOURNAMENT_MATCH_URL);
      fixture.detectChanges();
      const locked = () => env.store.selectSignal(selectMatchAwaitingResync)();
      return { ...env, fixture, locked };
    }

    /** One resync round: tournament reloaded, then its current match. */
    function reloadTournament(
      env: ReturnType<typeof openTournamentPage>,
      status = TournamentStatus.ACTIVE,
    ) {
      expect(env.answer(TOURNAMENT_JOIN_URL, tournament(status))).toBe(1);
      env.answerOthers(TOURNAMENT_JOIN_URL, TOURNAMENT_MATCH_URL);
    }

    it('se déverrouille une fois le tournoi puis le match rechargés, sans boucle', () => {
      const env = openTournamentPage();

      backToForeground(env.resumed$);
      expect(env.locked()).toBe(true);
      reloadTournament(env);
      expect(env.locked()).toBe(true);
      expect(env.answer(TOURNAMENT_MATCH_URL, playerMatch())).toBe(1);
      expect(env.locked()).toBe(false);

      vi.advanceTimersByTime(60_000);
      expect(env.pending(TOURNAMENT_JOIN_URL)).toHaveLength(0);
      expect(env.pending(TOURNAMENT_MATCH_URL)).toHaveLength(0);
    });

    it('se déverrouille pour un tournoi en brouillon, sans attendre de match', () => {
      const env = openTournamentPage(TournamentStatus.DRAFT);

      backToForeground(env.resumed$);
      reloadTournament(env, TournamentStatus.DRAFT);

      expect(env.locked()).toBe(false);
      expect(env.pending(TOURNAMENT_MATCH_URL)).toHaveLength(0);
    });

    it('réessaie une fois un match sans réponse, puis reste verrouillé, puis repart au signal suivant', () => {
      const env = openTournamentPage();

      backToForeground(env.resumed$);
      reloadTournament(env);
      vi.advanceTimersByTime(RELOAD_TIMEOUT);
      expect(env.pending(TOURNAMENT_MATCH_URL)).toHaveLength(1); // the retry
      vi.advanceTimersByTime(RELOAD_TIMEOUT);

      expect(env.locked()).toBe(true);
      vi.advanceTimersByTime(5 * 60_000);
      expect(env.pending(TOURNAMENT_MATCH_URL)).toHaveLength(0);

      backToForeground(env.resumed$);
      reloadTournament(env);
      expect(env.answer(TOURNAMENT_MATCH_URL, playerMatch())).toBe(1);
      expect(env.locked()).toBe(false);
    });

    it('réessaie une fois le tournoi sans réponse avant de rester verrouillé', () => {
      const env = openTournamentPage();

      backToForeground(env.resumed$);
      vi.advanceTimersByTime(RELOAD_TIMEOUT);
      expect(env.pending(TOURNAMENT_JOIN_URL)).toHaveLength(1); // the retry
      vi.advanceTimersByTime(RELOAD_TIMEOUT);

      expect(env.locked()).toBe(true);
      expect(env.pending(TOURNAMENT_JOIN_URL)).toHaveLength(0);
    });

    it('recharge à l’ouverture de la page quand le signal est arrivé sur une autre page', () => {
      const env = openTournamentPage();
      env.fixture.destroy();

      env.resumed$.next(); // the player is elsewhere: nobody reloads
      vi.advanceTimersByTime(RESYNC_DEBOUNCE);
      expect(env.locked()).toBe(true);
      expect(env.pending(TOURNAMENT_JOIN_URL)).toHaveLength(0);

      const fixture = TestBed.createComponent(PlayerTeamMatchPageComponent);
      fixture.detectChanges();
      reloadTournament(env);
      expect(env.answer(TOURNAMENT_MATCH_URL, playerMatch())).toBe(1);
      expect(env.locked()).toBe(false);
    });
  });
});
