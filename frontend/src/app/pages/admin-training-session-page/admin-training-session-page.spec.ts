import { Dialog } from '@angular/cdk/dialog';
import { selectLocalStorageData } from 'src/app/store/app-config/app-config.selectors';
import {
  removeLocalStorageData,
  setLocalStorageData,
} from 'src/app/store/app-config/app-config.actions';
import { skipRoundConfirmationKey } from 'src/app/store/app-config/round-confirmation';
import { ConfirmationPopupComponent } from 'src/app/modales/confirmation-popup/confirmation-popup';
import { generateTrainingRound } from 'src/app/store/training/training.round.actions';
import { LeaderboardPopup } from 'src/app/modales/leaderboard-popup/leaderboard-popup';
import { loadTrainingClubLeaderboard } from 'src/app/store/training/training.session.actions';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { resyncRequested } from 'src/app/store/realtime/realtime.actions';
import { connectTrainingSessionAdministrator } from 'src/app/store/training/training.session.actions';
import {
  AdminTrainingDto,
  TrainingMatchStatus,
  TrainingRoundDto,
  TrainingSessionAdminDto,
} from 'src/app/store/training/training.models';
import {
  selectAdminUpdateTrainingScoreLoading,
  selectCheckinTrainingParticipantLoading,
  selectCloseTrainingSessionError,
  selectCloseTrainingSessionLoading,
  selectCreateTrainingTeamLoading,
  selectCurrentTrainingAdminInformations,
  selectCurrentTrainingData,
  selectCurrentTrainingSessionData,
  selectCurrentTrainingSessionError,
  selectCurrentTrainingSessionIsLoading,
  selectGenerateTrainingRoundLoading,
  selectLastCheckedInTrainingParticipant,
  selectTrainingLeaderboard,
  selectTrainingLeaderboardIsLoading,
  selectTrainingRounds,
  selectTrainingRoundsIsLoading,
} from 'src/app/store/training/training.selectors';
import { AdminTrainingSessionPage } from './admin-training-session-page';

function buildTraining(): AdminTrainingDto {
  return {
    id: 't1',
    code: 'LAITON-2026',
    name: 'Entraînement du jeudi',
    createdAt: new Date().toISOString(),
    members: [
      { id: 'm1', name: 'Jean Dubois', code: '0001' },
      { id: 'm2', name: 'Marie Lefèvre', code: '0002' },
    ],
    adminMemberId: null,
  };
}

function buildSession(): TrainingSessionAdminDto {
  return {
    id: 's1',
    code: '1234',
    trainingCode: 'LAITON-2026',
    date: new Date().toISOString(),
    status: 'OPEN',
    playersPerTeam: 2,
    allowedTeamSizes: [1, 2],
    preferTargetTeamSize: true,
    plateCount: 4,
    teamComposition: 'RANDOM',
    avoidSamePartnerConsecutive: true,
    avoidSameOpponentConsecutive: true,
    pointsPerGame: 13,
    createdAt: new Date().toISOString(),
    participants: [
      { id: 'p1', name: 'Jean Dubois', status: 'PRESENT', code: '4821', memberId: 'm1' },
      { id: 'p2', name: 'Denis Lamy', status: 'LEFT', code: '6512' },
    ],
    teams: [],
  };
}

interface SetupOptions {
  localStorageData?: Record<string, unknown>;
  generateLoading?: boolean;
}

function setup({ localStorageData = {}, generateLoading = false }: SetupOptions = {}) {
  const activatedRoute = {
    paramMap: of(convertToParamMap({ trainingCode: 'LAITON-2026', sessionCode: '1234' })),
  } as unknown as ActivatedRoute;
  const routerMock = { navigate: vi.fn() };
  const dialogMock = { open: vi.fn() };
  const actions$ = new Subject<Action>();

  TestBed.configureTestingModule({
    imports: [AdminTrainingSessionPage],
    providers: [
      { provide: ActivatedRoute, useValue: activatedRoute },
      { provide: Router, useValue: routerMock },
      { provide: Dialog, useValue: dialogMock },
      { provide: Actions, useValue: actions$ },
      provideMockStore({
        selectors: [
          { selector: selectCurrentTrainingData, value: buildTraining() },
          {
            selector: selectCurrentTrainingAdminInformations,
            value: { code: 'LAITON-2026', password: 'secret' },
          },
          { selector: selectCurrentTrainingSessionData, value: buildSession() },
          { selector: selectCurrentTrainingSessionError, value: null },
          { selector: selectCurrentTrainingSessionIsLoading, value: false },
          { selector: selectTrainingRounds, value: [] },
          { selector: selectTrainingRoundsIsLoading, value: false },
          { selector: selectTrainingLeaderboard, value: [] },
          { selector: selectTrainingLeaderboardIsLoading, value: false },
          { selector: selectLastCheckedInTrainingParticipant, value: null },
          { selector: selectCheckinTrainingParticipantLoading, value: false },
          { selector: selectCreateTrainingTeamLoading, value: false },
          { selector: selectGenerateTrainingRoundLoading, value: generateLoading },
          { selector: selectLocalStorageData, value: localStorageData },
          { selector: selectCloseTrainingSessionLoading, value: false },
          { selector: selectCloseTrainingSessionError, value: null },
          { selector: selectAdminUpdateTrainingScoreLoading, value: false },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(AdminTrainingSessionPage);
  const store = TestBed.inject(MockStore);
  fixture.detectChanges();

  return { fixture, store, routerMock, dialogMock, actions$ };
}

describe('AdminTrainingSessionPage', () => {
  describe('nouveau round', () => {
    const generate = generateTrainingRound({ sessionCode: '1234' });

    it('demande confirmation avant de générer un round', () => {
      const { fixture, store, dialogMock } = setup();
      dialogMock.open.mockReturnValue({ closed: of(true) });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      fixture.componentInstance.generateRound();

      expect(dialogMock.open.mock.calls[0][0]).toBe(ConfirmationPopupComponent);
      expect(dialogMock.open.mock.calls[0][1].data.title).toBe('Générer un nouveau round ?');
      expect(dispatchSpy).toHaveBeenCalledWith(generate);
    });

    it('ne génère rien quand l’admin annule', () => {
      const { fixture, store, dialogMock } = setup();
      dialogMock.open.mockReturnValue({ closed: of(false) });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      fixture.componentInstance.generateRound();

      expect(dispatchSpy).not.toHaveBeenCalledWith(generate);
    });

    const OPT_OUT_KEY = skipRoundConfirmationKey('training', '1234');

    it('génère directement quand l’admin ne veut plus être sollicité pour cette séance', () => {
      const { fixture, store, dialogMock } = setup({
        localStorageData: { [OPT_OUT_KEY]: Date.now() },
      });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      fixture.componentInstance.generateRound();

      expect(dialogMock.open).not.toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(generate);
    });

    it('demande encore quand seul un tournoi de même code a été désactivé', () => {
      const { fixture, dialogMock } = setup({
        localStorageData: { [skipRoundConfirmationKey('tournament', '1234')]: Date.now() },
      });
      dialogMock.open.mockReturnValue({ closed: of(false) });

      fixture.componentInstance.generateRound();

      expect(dialogMock.open).toHaveBeenCalledTimes(1);
    });

    it('retient le choix « ne plus demander » de cette séance sous sa propre clé', () => {
      const now = Date.UTC(2026, 10, 27, 12);
      vi.spyOn(Date, 'now').mockReturnValue(now);
      const { fixture, store, dialogMock } = setup();
      dialogMock.open.mockReturnValue({ closed: of(true) });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      fixture.componentInstance.generateRound();
      dialogMock.open.mock.calls[0][1].data.onDontAskAgain();

      expect(dispatchSpy).toHaveBeenCalledWith(
        setLocalStorageData({ key: OPT_OUT_KEY, value: now }),
      );
      vi.restoreAllMocks();
    });

    it('oublie le choix une fois la séance clôturée', () => {
      const { fixture, store } = setup({ localStorageData: { [OPT_OUT_KEY]: Date.now() } });
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      expect(dispatchSpy).not.toHaveBeenCalledWith(removeLocalStorageData({ key: OPT_OUT_KEY }));

      store.overrideSelector(selectCurrentTrainingSessionData, {
        ...buildSession(),
        status: 'CLOSED',
      });
      store.refreshState();
      fixture.detectChanges();

      expect(dispatchSpy).toHaveBeenCalledWith(removeLocalStorageData({ key: OPT_OUT_KEY }));
    });

    it('ne fait rien pendant la génération d’un round', () => {
      const { fixture, store, dialogMock } = setup({ generateLoading: true });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      fixture.componentInstance.generateRound();

      expect(dialogMock.open).not.toHaveBeenCalled();
      expect(dispatchSpy).not.toHaveBeenCalledWith(generate);
    });
  });

  it('ouvre la popup de check-in avec le code de la séance', () => {
    const { fixture, dialogMock } = setup();

    fixture.componentInstance.openCheckin();

    expect(dialogMock.open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ data: { sessionCode: '1234' } }),
    );
  });

  it('recharge la séance quand un resync est demandé (reconnexion, retour au premier plan)', () => {
    const { store, actions$ } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    actions$.next(resyncRequested());

    expect(dispatchSpy).toHaveBeenCalledWith(
      connectTrainingSessionAdministrator({ sessionCode: '1234' }),
    );
  });

  it('ouvre les matchs de l’admin joueur inscrit à la séance', () => {
    const { fixture, store, routerMock } = setup();

    store.overrideSelector(selectCurrentTrainingData, { ...buildTraining(), adminMemberId: 'm1' });
    store.refreshState();
    fixture.detectChanges();
    fixture.componentInstance.playMyMatches();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/player/training/1234/4821'], {
      queryParams: { adminTraining: 'LAITON-2026' },
    });
  });

  it('grise « Jouer mes matchs » tant qu’aucun round n’est généré', () => {
    const { fixture, store } = setup();
    const playButton = () =>
      [
        ...(fixture.nativeElement as HTMLElement).querySelectorAll('app-session-actions .button'),
      ].find((button) => button.textContent?.includes('Jouer mes matchs'));

    store.overrideSelector(selectCurrentTrainingData, { ...buildTraining(), adminMemberId: 'm1' });
    store.refreshState();
    fixture.detectChanges();

    expect(playButton()?.getAttribute('aria-disabled')).toBe('true');

    store.overrideSelector(selectTrainingRounds, [
      { id: 'r1', roundNumber: 1, status: 'OPEN' as const, matches: [] },
    ]);
    store.refreshState();
    fixture.detectChanges();

    expect(playButton()?.getAttribute('aria-disabled')).toBe('false');
  });

  it('grise « Jouer mes matchs » une fois le match de l’admin validé, jusqu’au round suivant', () => {
    const { fixture, store } = setup();
    const buildRound = (id: string, roundNumber: number, status: TrainingMatchStatus) => ({
      id,
      roundNumber,
      status: 'OPEN' as const,
      matches: [
        {
          id: `match-${id}`,
          status,
          isBye: false,
          scoreA: 0,
          scoreB: 0,
          teamA: { id: 'tA', kind: 'EPHEMERAL' as const, members: [{ id: 'p3', name: 'Luc' }] },
          teamB: { id: 'tB', kind: 'EPHEMERAL' as const, members: [{ id: 'p1', name: 'Jean' }] },
        },
      ],
    });
    const showRounds = (...rounds: TrainingRoundDto[]) => {
      store.overrideSelector(selectTrainingRounds, rounds);
      store.refreshState();
      fixture.detectChanges();
    };
    const page = fixture.componentInstance;

    store.overrideSelector(selectCurrentTrainingData, { ...buildTraining(), adminMemberId: 'm1' });

    showRounds(buildRound('r1', 1, 'ENDED'));
    expect(page.playMyMatchesDisabled()).toBe(false);

    showRounds(buildRound('r1', 1, 'VALIDATED'));
    expect(page.playMyMatchesDisabled()).toBe(true);

    showRounds(buildRound('r1', 1, 'VALIDATED'), buildRound('r2', 2, 'PENDING'));
    expect(page.playMyMatchesDisabled()).toBe(false);
  });

  it('ne propose pas « Jouer mes matchs » sans admin joueur présent à la séance', () => {
    const { fixture, store } = setup();

    expect(fixture.componentInstance.adminParticipant()).toBeNull();

    // m2 is the admin player but has not checked in to this session.
    store.overrideSelector(selectCurrentTrainingData, { ...buildTraining(), adminMemberId: 'm2' });
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.componentInstance.adminParticipant()).toBeNull();
  });

  it('ne compte que les participants présents', () => {
    const { fixture } = setup();

    expect(fixture.componentInstance.presentParticipants().length).toBe(1);
  });

  it('renvoie au groupe quand la séance demandée ne se charge pas', () => {
    const { fixture, store, routerMock } = setup();

    store.overrideSelector(selectCurrentTrainingSessionData, null);
    store.overrideSelector(selectCurrentTrainingSessionError, 'Erreur: Session introuvable.');
    store.refreshState();
    fixture.detectChanges();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/training/LAITON-2026']);
  });

  // A network drop must not throw the admin out of a session already on screen.
  it('reste en place quand la séance est à l’écran et qu’un rafraîchissement échoue', () => {
    const { fixture, store, routerMock } = setup();

    store.overrideSelector(selectCurrentTrainingSessionError, 'Erreur: Connexion impossible.');
    store.refreshState();
    fixture.detectChanges();

    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('renvoie au groupe quand la séance appartient à un autre entraînement', () => {
    const { fixture, store, routerMock } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    store.overrideSelector(selectCurrentTrainingSessionData, {
      ...buildSession(),
      trainingCode: 'AUTRE-CLUB',
    });
    store.refreshState();
    fixture.detectChanges();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/training/LAITON-2026']);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: expect.objectContaining({
          message: expect.stringContaining('Séance introuvable pour ce groupe'),
        }),
      }),
    );
  });

  // A player who left mid-match will never validate their score: the session stops there.
  it('nomme le joueur parti qui bloque le round', () => {
    const { fixture, store } = setup();

    store.overrideSelector(selectTrainingRounds, [
      {
        id: 'r1',
        roundNumber: 1,
        status: 'OPEN' as const,
        matches: [
          {
            id: 'm1',
            status: 'ONGOING' as const,
            isBye: false,
            scoreA: 5,
            scoreB: 3,
            teamA: {
              id: 'tA',
              kind: 'EPHEMERAL' as const,
              members: [{ id: 'p1', name: 'Marie Lefèvre' }],
            },
            teamB: {
              id: 'tB',
              kind: 'EPHEMERAL' as const,
              members: [{ id: 'p2', name: 'Denis Lamy' }],
            },
          },
        ],
      },
    ]);
    store.refreshState();
    fixture.detectChanges();

    const reason = fixture.componentInstance.generateBlockedReason();
    expect(reason).toContain('Denis Lamy');
    expect(reason).toContain('Corrigez le score');
    expect(fixture.componentInstance.generateBlockedIsAlert()).toBe(true);
  });

  // Three players with teams of two: no combination forms two teams.
  it('explique qu’aucun match n’est possible avant même le clic', () => {
    const { fixture, store } = setup();
    store.overrideSelector(selectCurrentTrainingSessionData, {
      ...buildSession(),
      playersPerTeam: 2,
      allowedTeamSizes: [2],
      participants: [
        { id: 'p1', name: 'Marie Lefèvre', status: 'PRESENT', code: '4821' },
        { id: 'p2', name: 'Luc Béguin', status: 'PRESENT', code: '4822' },
        { id: 'p3', name: 'Jean Dubois', status: 'PRESENT', code: '4823' },
      ],
    });
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.componentInstance.canGenerateRound()).toBe(false);
    expect(fixture.componentInstance.generateBlockedReason()).toContain(
      "aucun match n'est possible",
    );
    expect(fixture.componentInstance.generateBlockedIsAlert()).toBe(true);
    expect(fixture.componentInstance.nextRoundPreview()).toBeNull();
  });

  it('annonce ce que donnerait le prochain round', () => {
    const { fixture, store } = setup();
    store.overrideSelector(selectCurrentTrainingSessionData, {
      ...buildSession(),
      playersPerTeam: 2,
      allowedTeamSizes: [2],
      participants: [
        { id: 'p1', name: 'Marie Lefèvre', status: 'PRESENT', code: '4821' },
        { id: 'p2', name: 'Luc Béguin', status: 'PRESENT', code: '4822' },
        { id: 'p3', name: 'Jean Dubois', status: 'PRESENT', code: '4823' },
        { id: 'p4', name: 'Claire Ozanne', status: 'PRESENT', code: '4824' },
      ],
    });
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.componentInstance.canGenerateRound()).toBe(true);
    expect(fixture.componentInstance.nextRoundPreview()).toContain('1 match (2v2)');
  });

  it("bloque la génération de round tant que personne n'est inscrit", () => {
    const { fixture, store } = setup();
    store.overrideSelector(selectCurrentTrainingSessionData, {
      ...buildSession(),
      participants: [],
    });
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.componentInstance.canGenerateRound()).toBe(false);
    expect(fixture.componentInstance.generateBlockedReason()).toContain('au moins un joueur');
  });

  it('charge le classement du club à l’ouverture de sa popup', () => {
    const { fixture, store, dialogMock } = setup();
    dialogMock.open.mockReturnValue({ closed: new Subject<void>() });
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.openClubLeaderboard();

    expect(dispatchSpy).toHaveBeenCalledWith(
      loadTrainingClubLeaderboard({ sessionCode: fixture.componentInstance.sessionCode()! }),
    );
    expect(dialogMock.open).toHaveBeenCalledWith(LeaderboardPopup, expect.anything());
  });

  it('marque l’admin dans le classement du club quand il joue la séance', () => {
    const { fixture, store, dialogMock } = setup();
    dialogMock.open.mockReturnValue({ closed: new Subject<void>() });
    store.overrideSelector(selectCurrentTrainingData, { ...buildTraining(), adminMemberId: 'm1' });
    store.refreshState();

    fixture.componentInstance.openClubLeaderboard();

    expect(dialogMock.open).toHaveBeenCalledWith(
      LeaderboardPopup,
      expect.objectContaining({ data: { scope: 'club', highlightedId: 'm1' } }),
    );
  });

  it('ne marque personne dans le classement du club quand l’admin ne joue pas', () => {
    const { fixture, dialogMock } = setup();
    dialogMock.open.mockReturnValue({ closed: new Subject<void>() });

    fixture.componentInstance.openClubLeaderboard();

    expect(dialogMock.open).toHaveBeenCalledWith(
      LeaderboardPopup,
      expect.objectContaining({ data: { scope: 'club', highlightedId: null } }),
    );
  });
});
