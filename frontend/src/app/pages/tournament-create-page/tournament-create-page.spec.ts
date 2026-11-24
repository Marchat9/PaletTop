import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SCORE_CALCULATIONS_BY_MODE } from 'src/app/models/app-setting.model';
import { TournamentConfigurationForm } from 'src/app/shared/tournament-configuration/tournament-configuration-form.model';
import {
  selectMaxConsolationCount,
  selectScoreCalculationsByMode,
} from 'src/app/store/app-settings/app-settings.selectors';
import { previewPlan } from 'src/app/store/tournament-plan/tournament-plan.actions';
import {
  selectPlanPreview,
  selectPlanPreviewLoading,
} from 'src/app/store/tournament-plan/tournament-plan.selectors';
import {
  selectTournamentCreationError,
  selectTournamentCreationIsLoading,
} from 'src/app/store/tournament/tournament.selectors';
import { TournamentCreatePageComponent } from './tournament-create-page';

// The configuration form is not under test, and it drags in a dozen components.
vi.mock('src/app/shared/tournament-configuration/tournament-configuration', () => ({
  TournamentConfiguration: class TournamentConfiguration {},
}));

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
      }),
    }),
  }) as unknown as TournamentConfigurationForm;
}

function setup() {
  TestBed.configureTestingModule({
    imports: [TournamentCreatePageComponent],
    providers: [
      { provide: Router, useValue: { navigate: vi.fn() } },
      provideMockStore({
        selectors: [
          { selector: selectScoreCalculationsByMode, value: DEFAULT_SCORE_CALCULATIONS_BY_MODE },
          { selector: selectTournamentCreationIsLoading, value: false },
          { selector: selectTournamentCreationError, value: null },
          { selector: selectMaxConsolationCount, value: 6 },
          { selector: selectPlanPreview, value: null },
          { selector: selectPlanPreviewLoading, value: false },
        ],
      }),
    ],
  });
  // The configuration form is not under test: the page is handed a form by hand.
  TestBed.overrideComponent(TournamentCreatePageComponent, {
    set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
  });

  const fixture = TestBed.createComponent(TournamentCreatePageComponent);
  fixture.detectChanges();
  const store = TestBed.inject(MockStore);
  const dispatchSpy = vi.spyOn(store, 'dispatch');
  return { fixture, page: fixture.componentInstance, dispatchSpy };
}

describe('TournamentCreatePageComponent live preview', () => {
  afterEach(() => vi.useRealTimers());

  it('previews the first configuration once, 300 ms after the form is ready', () => {
    vi.useFakeTimers();
    const { page, dispatchSpy } = setup();

    page.onFormReady(structuredForm(128));
    vi.advanceTimersByTime(299);
    expect(dispatchSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const action = dispatchSpy.mock.calls[0][0] as unknown as ReturnType<typeof previewPlan>;
    expect(action.type).toBe(previewPlan.type);
    expect(action.requestId).toBe('1');
    expect(action.body).toMatchObject({ teamCount: 128, targetCount: 128 });
  });

  it('dispatches exactly one preview, after 300 ms, when the target changes', () => {
    vi.useFakeTimers();
    const { page, dispatchSpy } = setup();
    const form = structuredForm(128);
    page.onFormReady(form);
    vi.advanceTimersByTime(300);
    dispatchSpy.mockClear();

    const target = form.controls.rules.controls.maxTeamCapacity;
    target.setValue(100);
    vi.advanceTimersByTime(200);
    target.setValue(96);
    vi.advanceTimersByTime(299);
    expect(dispatchSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const action = dispatchSpy.mock.calls[0][0] as unknown as ReturnType<typeof previewPlan>;
    expect(action.requestId).toBe('2');
    expect(action.body).toMatchObject({ teamCount: 96, targetCount: 96 });
  });

  it('asks nothing for a change that leaves the plan as it was', () => {
    vi.useFakeTimers();
    const { page, dispatchSpy } = setup();
    const form = structuredForm(128);
    page.onFormReady(form);
    vi.advanceTimersByTime(300);
    dispatchSpy.mockClear();

    form.controls.rules.controls.maxTeamCapacity.setValue(128);
    vi.advanceTimersByTime(1000);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('feeds the panel with the store, without registered teams', () => {
    const { page } = setup();

    expect(page.planState()).toEqual({
      plan: null,
      loading: false,
      maxConsolations: 6,
      registeredCount: null,
    });
  });
});
