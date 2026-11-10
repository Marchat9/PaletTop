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

function round(roundNumber: number): TrainingRoundDto {
  return {
    id: `r${roundNumber}`,
    roundNumber,
    status: 'OPEN',
    matches: [],
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
            value: [{ memberId: 'M1', name: 'Jean Dubois', wins: 5, points: 61 }],
          },
          { selector: selectTrainingClubLeaderboardIsLoading, value: false },
          { selector: selectTrainingClubLeaderboardError, value: null },
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
    const { fixture } = setup({ session: session(), rounds: [round(1), round(2)] });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.column.matches app-session-round')).not.toBeNull();
    expect(element.querySelector('.column.ranking app-session-leaderboard')).not.toBeNull();
    expect(element.textContent).toContain('Round : 2');
    expect(element.textContent).toContain('Séance en cours');
  });

  it('annonce une séance en configuration tant qu’aucun round n’est généré', () => {
    const { fixture } = setup({ session: session(), rounds: [] });
    const text = (fixture.nativeElement as HTMLElement).textContent;

    expect(text).toContain('La séance est en cours de configuration');
    expect(text).not.toContain('Inscrivez les joueurs présents');
  });

  it('remplace les matchs par le classement du club une fois la séance clôturée', () => {
    const { fixture, dispatchSpy } = setup({
      session: session({ status: 'CLOSED' }),
      rounds: [round(1)],
    });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.column.matches')).toBeNull();
    expect(element.querySelector('.column.club app-club-leaderboard-table')).not.toBeNull();
    expect(element.querySelector('.column.club')?.textContent).toContain('Jean Dubois');
    expect(element.querySelector('.column.ranking app-session-leaderboard')).not.toBeNull();
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
