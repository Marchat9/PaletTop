import { ActivatedRoute } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { resyncRequested } from 'src/app/store/realtime/realtime.actions';
import {
  selectSpectatorCurrentSession,
  selectSpectatorRanking,
  selectSpectatorTournamentData,
  selectSpectatorTournamentError,
  selectSpectatorTournamentIsLoading,
} from 'src/app/store/spectator/spectator.selectors';
import { loadSpectatorTournament } from 'src/app/store/spectator/spectator.actions';
import { SpectatorPageComponent } from './spectator-page';
import { setLocalStorageData } from 'src/app/store/app-config/app-config.actions';
import {
  selectSpectatorShowPodium,
  SPECTATOR_PODIUM_STORAGE_KEY,
} from 'src/app/store/app-config/app-config.selectors';

const TOURNAMENT = {
  id: 't-1',
  code: 'ABC123',
  name: 'Tournoi',
  status: TournamentStatus.ACTIVE,
  phaseName: 'Phase qualificative',
  scoreCalculation: 'victory_goal_average',
  teamNames: ['Équipe 2', 'Équipe 11'],
};

function match(id: string, status: string) {
  return {
    id,
    status,
    isBye: false,
    scoreA: 13,
    scoreB: 7,
    plateNumber: 1,
    teamA: { id: 'a', name: 'Les Fondus' },
    teamB: { id: 'b', name: 'Fanny Club' },
    poolNumber: null,
    group: null,
    startedAt: null,
    finishedAt: null,
    duration: null,
  };
}

function session(...statuses: string[]) {
  return {
    id: 's-3',
    sessionNumber: 3,
    status: 'OPEN',
    isDrawnRound: false,
    matches: statuses.map((status, index) => match(`m${index}`, status)),
  };
}

const RANKING = [
  {
    rank: 1,
    teamId: 'a',
    teamName: 'Les Fondus',
    wins: 3,
    pointsFor: 39,
    pointsAgainst: 13,
    goalAverage: 26,
    matchesPlayed: 3,
    tournamentPoints: 9,
  },
];

function setup(
  tournamentData: unknown = null,
  currentSession: unknown = null,
  ranking: unknown[] = [],
  showPodium = true,
) {
  const activatedRoute = {
    snapshot: { paramMap: { get: () => 'ABC123' } },
  } as unknown as ActivatedRoute;
  const actions$ = new Subject<Action>();

  TestBed.configureTestingModule({
    imports: [SpectatorPageComponent],
    providers: [
      { provide: ActivatedRoute, useValue: activatedRoute },
      { provide: Actions, useValue: actions$ },
      provideMockStore({
        selectors: [
          { selector: selectSpectatorTournamentData, value: tournamentData },
          { selector: selectSpectatorTournamentIsLoading, value: false },
          { selector: selectSpectatorTournamentError, value: null },
          { selector: selectSpectatorCurrentSession, value: currentSession },
          { selector: selectSpectatorRanking, value: ranking },
          { selector: selectSpectatorShowPodium, value: showPodium },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(SpectatorPageComponent);
  const store = TestBed.inject(MockStore);
  return { fixture, store, actions$ };
}

describe('SpectatorPageComponent', () => {
  it('dispatches loadSpectatorTournament with the route code when no data is loaded yet', () => {
    const { fixture, store } = setup(null);
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(loadSpectatorTournament({ tournamentCode: 'ABC123' }));
  });

  it('does not re-dispatch once tournament data is already present', () => {
    const { fixture, store } = setup({
      id: 't-1',
      code: 'ABC123',
      name: 'Tournoi',
      status: TournamentStatus.ACTIVE,
      scoreCalculation: 'victory_points_scored',
    });
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.detectChanges();

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: loadSpectatorTournament.type }),
    );
  });

  it('re-fetches the spectator tournament when a resync is requested', () => {
    const { fixture, store, actions$ } = setup({
      id: 't-1',
      code: 'ABC123',
      name: 'Tournoi',
      status: TournamentStatus.ACTIVE,
      scoreCalculation: 'victory_points_scored',
    });
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    actions$.next(resyncRequested());

    expect(dispatchSpy).toHaveBeenCalledWith(loadSpectatorTournament({ tournamentCode: 'ABC123' }));
  });

  describe('états de l’écran', () => {
    function render(tournamentData: unknown, currentSession: unknown = null) {
      const { fixture } = setup(tournamentData, currentSession, RANKING);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('avant le départ : liste les équipes inscrites et le code à partager', () => {
      const element = render({ ...TOURNAMENT, status: TournamentStatus.DRAFT });

      expect(element.textContent).toContain('Tournoi non démarré');
      expect(Array.from(element.querySelectorAll('.chip')).map((chip) => chip.textContent)).toEqual(
        ['Équipe 2', 'Équipe 11'],
      );
      expect(element.querySelector('app-leaderboard')).toBeNull();
    });

    it('pendant un round : matchs et classement côte à côte', () => {
      const element = render(TOURNAMENT, session('VALIDATED', 'ONGOING'));

      expect(element.querySelector('.board.split .matches app-live-match-board')).not.toBeNull();
      expect(element.querySelector('.board.split .ranking app-leaderboard')).not.toBeNull();
      // The badge wraps over two lines in the template: compare the text, not its spacing.
      expect(element.textContent?.replace(/\s+/g, ' ')).toContain('Round 3 · 1 / 2 matchs validés');
    });

    it('entre deux rounds : le classement seul, et le round annoncé terminé', () => {
      const element = render(TOURNAMENT, session('VALIDATED', 'VALIDATED'));

      expect(element.querySelector('app-live-match-board')).toBeNull();
      expect(element.querySelector('.board:not(.split) app-leaderboard')).not.toBeNull();
      expect(element.textContent).toContain('Round 3 · terminé');
    });

    it('ne compte pas le match exempt parmi les matchs du round', () => {
      const withBye = session('VALIDATED', 'ONGOING');
      withBye.matches.push({ ...match('bye', 'VALIDATED'), isBye: true, teamB: null as never });
      const element = render(TOURNAMENT, withBye);

      expect(element.textContent?.replace(/\s+/g, ' ')).toContain('Round 3 · 1 / 2 matchs validés');
    });

    it('à la fin : le vainqueur et le classement final', () => {
      const element = render(
        { ...TOURNAMENT, status: TournamentStatus.FINISHED },
        session('VALIDATED'),
      );

      expect(element.querySelector('.winner-name')?.textContent).toContain('Les Fondus');
      expect(element.textContent).toContain('Classement final');
      expect(element.querySelector('app-live-match-board')).toBeNull();
    });
  });

  describe('interrupteur du podium', () => {
    it('sans podium, le classement commence par la première place dans le tableau', () => {
      const { fixture } = setup(TOURNAMENT, session('VALIDATED', 'VALIDATED'), RANKING, false);
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;

      expect(element.querySelector('.podium')).toBeNull();
      expect(element.querySelector('tbody tr')?.textContent).toContain('Les Fondus');
    });

    it('retient le choix du spectateur', () => {
      const { fixture, store } = setup(TOURNAMENT, session('VALIDATED'), RANKING);
      fixture.detectChanges();
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      fixture.componentInstance.togglePodium(false);

      expect(dispatchSpy).toHaveBeenCalledWith(
        setLocalStorageData({ key: SPECTATOR_PODIUM_STORAGE_KEY, value: false }),
      );
    });
  });
});
