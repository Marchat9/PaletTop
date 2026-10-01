import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { resyncRequested } from 'src/app/store/realtime/realtime.actions';
import { connectTrainingSessionAdministrator } from 'src/app/store/training/training.session.actions';
import { AdminTrainingDto, TrainingSessionAdminDto } from 'src/app/store/training/training.models';
import {
  selectAdminUpdateTrainingScoreLoading,
  selectCheckinTrainingParticipantLoading,
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
      { id: 'm1', name: 'Jean Dubois' },
      { id: 'm2', name: 'Marie Lefèvre' },
    ],
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

function setup() {
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
          { selector: selectGenerateTrainingRoundLoading, value: false },
          { selector: selectCloseTrainingSessionLoading, value: false },
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
});
