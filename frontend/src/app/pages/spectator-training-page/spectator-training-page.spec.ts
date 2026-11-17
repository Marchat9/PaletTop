import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { resyncRequested } from 'src/app/store/realtime/realtime.actions';
import { loadTrainingRounds } from 'src/app/store/training/training.round.actions';
import {
  leaveTrainingSession,
  loadTrainingClubLeaderboard,
  loadTrainingLeaderboard,
  loadTrainingSessionPublic,
  refreshTrainingClubLeaderboard,
  spectateTrainingSession,
} from 'src/app/store/training/training.session.actions';
import { TrainingRoundDto, TrainingSessionPublicDto } from 'src/app/store/training/training.models';
import {
  selectCurrentTrainingSessionData,
  selectCurrentTrainingSessionError,
  selectCurrentTrainingSessionIsLoading,
  selectTrainingClubLeaderboard,
  selectTrainingClubLeaderboardError,
  selectTrainingClubLeaderboardIsLoading,
  selectTrainingLeaderboard,
  selectTrainingLeaderboardIsLoading,
  selectTrainingRounds,
  selectTrainingRoundsIsLoading,
} from 'src/app/store/training/training.selectors';
import { SpectatorTrainingPage } from './spectator-training-page';
import { selectSpectatorShowPodium } from 'src/app/store/app-config/app-config.selectors';

function session(overrides: Partial<TrainingSessionPublicDto> = {}): TrainingSessionPublicDto {
  return {
    id: 's1',
    code: '123456',
    date: '2026-11-09T18:00:00.000Z',
    status: 'OPEN',
    pointsPerGame: 13,
    participants: [],
    teams: [],
    ...overrides,
  } as TrainingSessionPublicDto;
}

function round(roundNumber: number, ...statuses: string[]): TrainingRoundDto {
  return {
    id: `r${roundNumber}`,
    roundNumber,
    status: 'OPEN',
    matches: statuses.map((status, index) => ({
      id: `m${roundNumber}-${index}`,
      status,
      isBye: false,
      scoreA: 0,
      scoreB: 0,
      teamA: { id: 'A', kind: 'EPHEMERAL', members: [{ id: 'p1', name: 'Julie' }] },
      teamB: { id: 'B', kind: 'EPHEMERAL', members: [{ id: 'p2', name: 'Loïc' }] },
    })),
  } as unknown as TrainingRoundDto;
}

function setup(
  options: {
    code?: string;
    session?: TrainingSessionPublicDto | null;
    rounds?: TrainingRoundDto[];
    error?: string | null;
  } = {},
) {
  const actions$ = new Subject<Action>();
  const routerMock = { navigate: vi.fn(), navigateByUrl: vi.fn() };
  const dispatchSpy = vi.spyOn(MockStore.prototype, 'dispatch');

  TestBed.configureTestingModule({
    imports: [SpectatorTrainingPage],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => options.code ?? '123456' } } },
      },
      { provide: Router, useValue: routerMock },
      { provide: Dialog, useValue: { open: vi.fn() } },
      { provide: Actions, useValue: actions$ },
      provideMockStore({
        selectors: [
          { selector: selectCurrentTrainingSessionData, value: options.session ?? null },
          { selector: selectCurrentTrainingSessionIsLoading, value: false },
          { selector: selectCurrentTrainingSessionError, value: options.error ?? null },
          { selector: selectTrainingRounds, value: options.rounds ?? [] },
          { selector: selectTrainingRoundsIsLoading, value: false },
          { selector: selectTrainingLeaderboard, value: [] },
          { selector: selectTrainingLeaderboardIsLoading, value: false },
          {
            selector: selectTrainingClubLeaderboard,
            value: [
              { memberId: 'M1', name: 'Jean Dubois', wins: 5, points: 61, sessionsPlayed: 3 },
            ],
          },
          { selector: selectTrainingClubLeaderboardIsLoading, value: false },
          { selector: selectTrainingClubLeaderboardError, value: null },
          { selector: selectSpectatorShowPodium, value: true },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(SpectatorTrainingPage);
  fixture.detectChanges();
  return { fixture, actions$, routerMock, dispatchSpy };
}

describe('SpectatorTrainingPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejoint la séance en spectateur et charge séance, rounds et classement', () => {
    const { dispatchSpy } = setup();

    expect(dispatchSpy).toHaveBeenCalledWith(spectateTrainingSession({ sessionCode: '123456' }));
    expect(dispatchSpy).toHaveBeenCalledWith(loadTrainingSessionPublic({ sessionCode: '123456' }));
    expect(dispatchSpy).toHaveBeenCalledWith(loadTrainingRounds({ sessionCode: '123456' }));
    expect(dispatchSpy).toHaveBeenCalledWith(loadTrainingLeaderboard({ sessionCode: '123456' }));
  });

  it('recharge tout à chaque resynchronisation', () => {
    const { actions$, dispatchSpy } = setup();
    dispatchSpy.mockClear();

    actions$.next(resyncRequested());

    expect(dispatchSpy).toHaveBeenCalledWith(loadTrainingSessionPublic({ sessionCode: '123456' }));
    expect(dispatchSpy).toHaveBeenCalledWith(loadTrainingRounds({ sessionCode: '123456' }));
    expect(dispatchSpy).toHaveBeenCalledWith(loadTrainingLeaderboard({ sessionCode: '123456' }));
  });

  it('quitte le salon de la séance en sortant de la page', () => {
    const { fixture, dispatchSpy } = setup();

    fixture.destroy();

    expect(dispatchSpy).toHaveBeenCalledWith(leaveTrainingSession());
  });

  it('refuse un code qui ne fait pas 6 chiffres et redemande le code', () => {
    const { routerMock, dispatchSpy } = setup({ code: '1234' });

    expect(routerMock.navigate).toHaveBeenCalledWith(['/spectateur/training']);
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: spectateTrainingSession.type }),
    );
  });

  it('affiche les matchs du dernier round et le classement côte à côte', () => {
    const { fixture } = setup({
      session: session(),
      rounds: [round(1, 'VALIDATED'), round(2, 'VALIDATED', 'ONGOING')],
    });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.board.split .matches app-live-match-board')).not.toBeNull();
    expect(element.querySelector('.board.split .ranking app-leaderboard')).not.toBeNull();
    expect(element.querySelector('.matches')?.textContent).toContain('Julie');
    expect(element.textContent).toContain('Round 2 · 1 / 2 matchs validés');
    expect(element.textContent).toContain('Séance en cours');
  });

  it('montre le classement seul entre deux rounds, le round annoncé terminé', () => {
    const { fixture } = setup({ session: session(), rounds: [round(1, 'VALIDATED')] });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-live-match-board')).toBeNull();
    expect(element.querySelector('.board:not(.split) .ranking app-leaderboard')).not.toBeNull();
    expect(element.textContent).toContain('Round 1 · terminé');
  });

  describe('avec un exempt, qui reste en attente', () => {
    function withBye(roundNumber: number, ...statuses: string[]): TrainingRoundDto {
      const built = round(roundNumber, ...statuses, 'PENDING');
      const bye = built.matches[built.matches.length - 1];
      Object.assign(bye, { isBye: true, teamB: null, plateNumber: null });
      return built;
    }

    it('ne le compte pas parmi les matchs du round et l’affiche sans plaque', () => {
      const { fixture } = setup({
        session: session(),
        rounds: [withBye(1, 'VALIDATED', 'ONGOING')],
      });
      const element = fixture.nativeElement as HTMLElement;

      expect(element.textContent).toContain('Round 1 · 1 / 2 matchs validés');
      expect(element.querySelector('.is-bye .plate')?.textContent).toContain('Plaque -');
    });

    it('annonce le round terminé quand tous les vrais matchs sont validés', () => {
      const { fixture } = setup({
        session: session(),
        rounds: [withBye(1, 'VALIDATED', 'VALIDATED')],
      });
      const element = fixture.nativeElement as HTMLElement;

      expect(element.textContent).toContain('Round 1 · terminé');
    });
  });

  it('liste les joueurs présents tant qu’aucun round n’est généré', () => {
    const { fixture } = setup({
      session: session({
        participants: [
          { id: 'p2', name: 'Loïc', status: 'PRESENT' },
          { id: 'p1', name: 'Julie', status: 'PRESENT' },
          { id: 'p3', name: 'Parti', status: 'LEFT' },
        ],
      } as Partial<TrainingSessionPublicDto>),
      rounds: [],
    });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('La séance va bientôt commencer');
    expect(Array.from(element.querySelectorAll('.chip')).map((chip) => chip.textContent)).toEqual([
      'Julie',
      'Loïc',
    ]);
  });

  it('montre la séance et le club côte à côte une fois la séance clôturée', () => {
    const { fixture, dispatchSpy } = setup({
      session: session({ status: 'CLOSED' }),
      rounds: [round(1)],
    });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-live-match-board')).toBeNull();
    expect(element.querySelector('.board .club app-leaderboard')).not.toBeNull();
    expect(element.querySelector('.board .club')?.textContent).toContain('Jean Dubois');
    expect(element.querySelector('.board .ranking app-leaderboard')).not.toBeNull();
    expect(element.textContent).toContain('Séance terminée');
    expect(dispatchSpy).toHaveBeenCalledWith(
      loadTrainingClubLeaderboard({ sessionCode: '123456' }),
    );
  });

  it('rafraîchit le classement du club sans le vider à la resynchronisation', () => {
    const { actions$, dispatchSpy } = setup({
      session: session({ status: 'CLOSED' }),
      rounds: [round(1)],
    });
    dispatchSpy.mockClear();

    actions$.next(resyncRequested());

    expect(dispatchSpy).toHaveBeenCalledWith(
      refreshTrainingClubLeaderboard({ sessionCode: '123456' }),
    );
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      loadTrainingClubLeaderboard({ sessionCode: '123456' }),
    );
  });

  it('ne charge pas le classement du club tant que la séance est ouverte', () => {
    const { dispatchSpy } = setup({ session: session(), rounds: [round(1)] });

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: loadTrainingClubLeaderboard.type }),
    );
  });

  it("n'affiche pas une autre séance restée dans le store", () => {
    const { fixture } = setup({ session: session({ code: '999999' }) });

    expect(fixture.componentInstance.session()).toBeNull();
  });

  it('propose de ressaisir le code quand la séance est introuvable', () => {
    const { fixture } = setup({ error: 'Session introuvable' });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Séance introuvable.');
    expect(element.textContent).toContain('Ressaisir le code');
  });
});
