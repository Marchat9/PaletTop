import { Dialog } from '@angular/cdk/dialog';
import { DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of, Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SCORE_CALCULATIONS_BY_MODE } from 'src/app/models/app-setting.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { TournamentConfiguration } from 'src/app/shared/tournament-configuration/tournament-configuration';
import { TournamentConfigurationForm } from 'src/app/shared/tournament-configuration/tournament-configuration-form.model';
import {
  selectMaxConsolationCount,
  selectScoreCalculationsByMode,
} from 'src/app/store/app-settings/app-settings.selectors';
import { resyncRequested } from 'src/app/store/realtime/realtime.actions';
import {
  connectTournamentAdministrator,
  updateTournamentAdministratorConfigurationSuccess,
} from 'src/app/store/tournament/tournament.admin.actions';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import {
  selectCurrentTournamentAdminInformations,
  selectCurrentTournamentData,
  selectCurrentTournamentIsAdminView,
  selectCurrentTournamentIsLoading,
  selectTournamentUpdateConfigLoading,
} from 'src/app/store/tournament/tournament.selectors';
import { previewPlan, simulatePlan } from 'src/app/store/tournament-plan/tournament-plan.actions';
import {
  selectPlanPreview,
  selectPlanPreviewLoading,
  selectSimulatedPlan,
  selectSimulationError,
} from 'src/app/store/tournament-plan/tournament-plan.selectors';
import { AdminTournamentConfigurationPage } from './admin-tournament-configuration-page';

function buildTournament(status = TournamentStatus.DRAFT): TournamentDto {
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
    status,
    teams: [],
    createdAt: new Date().toISOString(),
    tournamentStatus: null,
  };
}

function structuredForm(target = 128): TournamentConfigurationForm {
  return new FormGroup({
    rules: new FormGroup({ maxTeamCapacity: new FormControl(target, { nonNullable: true }) }),
    modeParameter: new FormGroup({
      competitionMode: new FormControl('standard', { nonNullable: true }),
      structuredMode: new FormGroup({
        numberOfQualifyingRounds: new FormControl(4, { nonNullable: true }),
        consolationCount: new FormControl(1, { nonNullable: true }),
        hasChallenges: new FormControl(false, { nonNullable: true }),
        hasThirdPlaceMatch: new FormControl(false, { nonNullable: true }),
        eliminationPairingMode: new FormControl('random', { nonNullable: true }),
      }),
    }),
  }) as unknown as TournamentConfigurationForm;
}

function setup({ status = TournamentStatus.DRAFT, isAdminView = true } = {}) {
  const routerMock = { navigate: vi.fn() };
  const actions$ = new Subject<Action>();

  TestBed.configureTestingModule({
    imports: [AdminTournamentConfigurationPage],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap({ tournamentCode: 'ABCD' })),
          snapshot: { queryParamMap: convertToParamMap({}) },
        },
      },
      { provide: Router, useValue: routerMock },
      { provide: Dialog, useValue: { open: vi.fn() } },
      { provide: Actions, useValue: actions$ },
      provideMockStore({
        selectors: [
          { selector: selectScoreCalculationsByMode, value: DEFAULT_SCORE_CALCULATIONS_BY_MODE },
          { selector: selectMaxConsolationCount, value: 4 },
          { selector: selectPlanPreview, value: null },
          { selector: selectPlanPreviewLoading, value: false },
          { selector: selectSimulatedPlan, value: null },
          { selector: selectSimulationError, value: null },
          { selector: selectCurrentTournamentData, value: buildTournament(status) },
          {
            selector: selectCurrentTournamentAdminInformations,
            value: { code: 'ABCD', password: 'secret' },
          },
          { selector: selectCurrentTournamentIsLoading, value: false },
          { selector: selectCurrentTournamentIsAdminView, value: isAdminView },
          { selector: selectTournamentUpdateConfigLoading, value: false },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(AdminTournamentConfigurationPage);
  return { fixture, store: TestBed.inject(MockStore), actions$, routerMock };
}

function previewCalls(dispatchSpy: { mock: { calls: unknown[][] } }): unknown[][] {
  return dispatchSpy.mock.calls.filter(([action]) => (action as Action).type === previewPlan.type);
}

/** The configuration form the page renders: it is the one the page previews and simulates. */
function renderedForm(fixture: { debugElement: DebugElement }): TournamentConfigurationForm {
  return (
    fixture.debugElement.query(By.directive(TournamentConfiguration))
      .componentInstance as TournamentConfiguration
  ).form;
}

describe('AdminTournamentConfigurationPage', { timeout: 15_000 }, () => {
  afterEach(() => vi.useRealTimers());

  it('re-fetches the tournament as admin when a resync is requested', () => {
    const { fixture, store, actions$ } = setup();
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    actions$.next(resyncRequested());

    expect(dispatchSpy).toHaveBeenCalledWith(
      connectTournamentAdministrator({ code: 'ABCD', password: 'secret' }),
    );
  });

  it('fetches the admin view when only the player view of this tournament is loaded', () => {
    const { fixture, store } = setup({ isAdminView: false });
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(
      connectTournamentAdministrator({ code: 'ABCD', password: 'secret' }),
    );
  });

  it('goes back to the tournament', () => {
    const { fixture, routerMock } = setup();
    fixture.detectChanges();

    fixture.componentInstance.backToTournament();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/tournament', 'ABCD']);
  });

  describe('live preview of the brackets', () => {
    it('previews a draft with its registered teams, once, 300 ms after the last change', () => {
      vi.useFakeTimers();
      const { fixture, store } = setup();
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      fixture.detectChanges();
      const form = renderedForm(fixture);

      vi.advanceTimersByTime(300);
      expect(previewCalls(dispatchSpy)).toHaveLength(1);
      const [first] = previewCalls(dispatchSpy)[0];
      expect(first).toMatchObject({ type: previewPlan.type, requestId: '1' });
      expect((first as unknown as ReturnType<typeof previewPlan>).body.targetCount).toBe(16);

      form.controls.rules.controls.maxTeamCapacity.setValue(96);
      form.controls.rules.controls.maxTeamCapacity.setValue(64);
      vi.advanceTimersByTime(299);
      expect(previewCalls(dispatchSpy)).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(previewCalls(dispatchSpy)).toHaveLength(2);
      expect(previewCalls(dispatchSpy)[1][0]).toMatchObject({ requestId: '2' });
    });

    it('does not preview again when only the elimination pairing changes', () => {
      vi.useFakeTimers();
      const { fixture, store } = setup();
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      fixture.detectChanges();
      const form = renderedForm(fixture);
      vi.advanceTimersByTime(300);
      expect(previewCalls(dispatchSpy)).toHaveLength(1);

      form.controls.modeParameter.controls.structuredMode.controls.eliminationPairingMode.setValue(
        'dutch',
      );
      vi.advanceTimersByTime(1000);

      expect(previewCalls(dispatchSpy)).toHaveLength(1);
    });

    it('simulates a draft apart from the preview, with the count the slider gives', () => {
      vi.useFakeTimers();
      const { fixture, store } = setup();
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      fixture.detectChanges();

      renderedForm(fixture).controls.rules.controls.maxTeamCapacity.setValue(128);
      vi.advanceTimersByTime(300);
      fixture.componentInstance.simulatedTeamCount.set(100);
      fixture.detectChanges();
      vi.advanceTimersByTime(300);

      const simulations = dispatchSpy.mock.calls
        .map(([action]) => action as unknown as ReturnType<typeof simulatePlan>)
        .filter((action) => action.type === simulatePlan.type);
      expect(simulations.map((action) => action.body.teamCount)).toEqual([128, 100]);
      expect(previewCalls(dispatchSpy)).toHaveLength(1);
    });

    it('only offers the panel, and the preview, while the tournament is a draft', () => {
      vi.useFakeTimers();
      const { fixture, store } = setup({ status: TournamentStatus.ACTIVE });
      fixture.detectChanges();
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      fixture.componentInstance.onConfigurationFormReady(structuredForm());
      vi.advanceTimersByTime(1000);

      expect(dispatchSpy).not.toHaveBeenCalled();
      expect(fixture.componentInstance.planState()).toBeNull();
      expect(fixture.componentInstance.simulation()).toBeNull();
    });

    it('shows the registered count of a draft in the panel state', () => {
      const { fixture } = setup();

      expect(fixture.componentInstance.planState()).toEqual({
        plan: null,
        loading: false,
        maxConsolations: 4,
        registeredCount: 0,
      });
    });
  });

  describe('unsaved changes', () => {
    it('has none until the form is edited', () => {
      const { fixture } = setup();
      fixture.detectChanges();
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);

      const control = renderedForm(fixture).controls.rules.controls.maxTeamCapacity;
      control.setValue(64);
      control.markAsDirty();

      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    });

    it('has none left once the configuration is saved', () => {
      const { fixture, actions$ } = setup();
      fixture.detectChanges();
      const control = renderedForm(fixture).controls.rules.controls.maxTeamCapacity;
      control.setValue(64);
      control.markAsDirty();

      actions$.next(
        updateTournamentAdministratorConfigurationSuccess({ tournament: buildTournament() }),
      );

      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    });
  });
});
