import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import {
  createTrainingSession,
  loadTrainingSessions,
} from 'src/app/store/training/training.session.actions';
import {
  AdminTrainingDto,
  TrainingSessionAdminDto,
  TrainingSessionSummaryDto,
} from 'src/app/store/training/training.models';
import {
  selectCreateTrainingSessionError,
  selectCreateTrainingSessionLoading,
  selectCurrentTrainingAdminInformations,
  selectCurrentTrainingData,
  selectCurrentTrainingSessionData,
  selectTrainingSessions,
} from 'src/app/store/training/training.selectors';
import { TrainingSessionCreationPage } from './training-session-creation-page';

function buildTraining(): AdminTrainingDto {
  return {
    id: 't1',
    code: 'LAITON-2026',
    name: 'Entraînement du jeudi',
    createdAt: new Date().toISOString(),
    members: [
      { id: 'm1', name: 'Jean Dubois' },
      { id: 'm2', name: 'Marie Lefèvre' },
      { id: 'm3', name: 'Luc Béguin' },
    ],
  };
}

const previousSummary: TrainingSessionSummaryDto = {
  code: '1111',
  date: new Date('2026-03-05').toISOString(),
  status: 'CLOSED',
  participantsCount: 10,
};

function buildPreviousSession(): TrainingSessionAdminDto {
  return {
    id: 's0',
    code: '1111',
    trainingCode: 'LAITON-2026',
    date: new Date('2026-03-05').toISOString(),
    status: 'CLOSED',
    playersPerTeam: 3,
    allowedTeamSizes: [2, 3],
    preferTargetTeamSize: true,
    plateCount: 2,
    teamComposition: 'LEARNING',
    avoidSamePartnerConsecutive: false,
    avoidSameOpponentConsecutive: true,
    pointsPerGame: 15,
    createdAt: new Date('2026-03-05').toISOString(),
    participants: [],
    teams: [],
  };
}

function setup(sessions: TrainingSessionSummaryDto[] = [previousSummary]) {
  const activatedRoute = {
    paramMap: of(convertToParamMap({ trainingCode: 'LAITON-2026' })),
  } as unknown as ActivatedRoute;
  const routerMock = { navigate: vi.fn() };

  TestBed.configureTestingModule({
    imports: [TrainingSessionCreationPage],
    providers: [
      { provide: ActivatedRoute, useValue: activatedRoute },
      { provide: Router, useValue: routerMock },
      provideMockStore({
        selectors: [
          { selector: selectCurrentTrainingData, value: buildTraining() },
          {
            selector: selectCurrentTrainingAdminInformations,
            value: { code: 'LAITON-2026', password: 'secret' },
          },
          { selector: selectTrainingSessions, value: sessions },
          { selector: selectCurrentTrainingSessionData, value: buildPreviousSession() },
          { selector: selectCreateTrainingSessionLoading, value: false },
          { selector: selectCreateTrainingSessionError, value: null },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(TrainingSessionCreationPage);
  const store = TestBed.inject(MockStore);
  // Spied before the first cycle: the loading effects start at that very moment.
  const dispatchSpy = vi.spyOn(store, 'dispatch');
  fixture.detectChanges();

  return { fixture, store, routerMock, dispatchSpy };
}

function countLoadSessionsCalls(dispatchSpy: { mock: { calls: unknown[][] } }): number {
  return dispatchSpy.mock.calls.filter(
    (call) => (call[0] as { type?: string })?.type === loadTrainingSessions.type,
  ).length;
}

describe('TrainingSessionCreationPage', () => {
  it('ne recharge pas la liste des séances quand elle revient vide', () => {
    // Regression: the loading effect read the list it feeds. An empty list coming back as a new
    // array, it re-triggered itself on its own response, for ever.
    const { fixture, store, dispatchSpy } = setup([]);

    expect(countLoadSessionsCalls(dispatchSpy)).toBe(1);

    store.overrideSelector(selectTrainingSessions, []);
    store.refreshState();
    fixture.detectChanges();

    expect(countLoadSessionsCalls(dispatchSpy)).toBe(1);
  });

  it('reprend les réglages de la séance précédente à la demande', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    expect(component.playersPerTeam()).toBe(2);

    component.reusePreviousSettings();

    expect(component.playersPerTeam()).toBe(3);
    expect(component.allowedTeamSizes()).toEqual([2, 3]);
    expect(component.preferTargetTeamSize()).toBe(true);
    expect(component.plateCount()).toBe(2);
    expect(component.teamComposition()).toBe('LEARNING');
    expect(component.pointsPerGame()).toBe(15);
    expect(component.avoidSamePartnerConsecutive()).toBe(false);
    expect(component.avoidSameOpponentConsecutive()).toBe(true);
    expect(component.settingsReused()).toBe(true);
  });

  it('propose les six tailles de repli, la taille visée verrouillée', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const options = component.teamSizeOptions();
    expect(options.map((option) => option.value)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(options.find((option) => option.value === 2)?.locked).toBe(true);
    expect(options.find((option) => option.value === 3)?.locked).toBe(false);
  });

  it('cache la composition par niveau pour des équipes d’un seul joueur', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    expect(component.showComposition()).toBe(true);
    component.playersPerTeam.set(1);
    expect(component.showComposition()).toBe(false);
  });

  // The preview is based on the roster: no participant is checked in at this stage.
  it('annonce ce que donneraient les réglages avec les membres du groupe', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    component.playersPerTeam.set(2);
    component.allowedTeamSizes.set([1]);
    expect(component.rosterPreview()).toContain('Avec vos 3 membres');
    expect(component.rosterPreview()).toContain('2v1');
  });

  it('crée la séance avec les valeurs du formulaire', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const component = fixture.componentInstance;

    component.onDateChange(new Date('2026-03-12'));
    component.pointsPerGame.set(13);
    component.submit();

    expect(dispatchSpy).toHaveBeenCalledWith(
      createTrainingSession({
        trainingCode: 'LAITON-2026',
        configuration: {
          date: new Date('2026-03-12'),
          playersPerTeam: 2,
          allowedTeamSizes: [],
          preferTargetTeamSize: false,
          plateCount: 4,
          teamComposition: 'RANDOM',
          avoidSamePartnerConsecutive: true,
          avoidSameOpponentConsecutive: true,
          pointsPerGame: 13,
        },
      }),
    );
  });
});
