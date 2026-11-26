import { FormControl, FormGroup, Validators } from '@angular/forms';
import { TournamentModeParameterForm } from '../shared/tournament-configuration/tournament-mode-parameter/tournament-mode-parameter-form.model';
import { TournamentConfigurationForm } from '../shared/tournament-configuration/tournament-configuration-form.model';
import { BehaviorSubject, debounceTime } from 'rxjs';
import { PlanPreviewBody } from '../models/tournament-plan.model';
import {
  buildPlanPreviewBody,
  PLAN_PREVIEW_DEBOUNCE_MS,
  planPreviewBodies,
  extractCompetitionConfiguration,
} from './tournament-configuration.utils';

function upDownModeParameter(pairingMode: 'random' | 'dutch'): TournamentModeParameterForm {
  return new FormGroup({
    competitionMode: new FormControl('up_down', { nonNullable: true }),
    upDownMode: new FormGroup({
      numberOfRound: new FormControl<number | undefined>(4, { nonNullable: true }),
      lastRoundByRanking: new FormControl(true, { nonNullable: true }),
      pairingMode: new FormControl(pairingMode, { nonNullable: true }),
    }),
  }) as unknown as TournamentModeParameterForm;
}

describe('extractCompetitionConfiguration', () => {
  it('sends the up-down pairing mode with the other up-down settings', () => {
    expect(extractCompetitionConfiguration(upDownModeParameter('dutch'))).toEqual({
      numberOfRound: 4,
      lastRoundByRanking: true,
      pairingMode: 'dutch',
    });
    expect(extractCompetitionConfiguration(upDownModeParameter('random'))).toEqual(
      expect.objectContaining({ pairingMode: 'random' }),
    );
  });
});

function structuredForm(
  overrides: { mode?: string; target?: number; qualifyingRounds?: number } = {},
): TournamentConfigurationForm {
  return new FormGroup({
    rules: new FormGroup({
      maxTeamCapacity: new FormControl(overrides.target ?? 128, { nonNullable: true }),
    }),
    modeParameter: new FormGroup({
      competitionMode: new FormControl(overrides.mode ?? 'standard', { nonNullable: true }),
      structuredMode: new FormGroup({
        numberOfQualifyingRounds: new FormControl(overrides.qualifyingRounds ?? 4, {
          nonNullable: true,
          validators: [Validators.required, Validators.min(1)],
        }),
        consolationCount: new FormControl(2, { nonNullable: true }),
        hasChallenges: new FormControl(true, { nonNullable: true }),
        hasThirdPlaceMatch: new FormControl(false, { nonNullable: true }),
        eliminationSeeding: new FormControl('random', { nonNullable: true }),
      }),
    }),
  }) as unknown as TournamentConfigurationForm;
}

describe('extractCompetitionConfiguration (structured)', () => {
  it('sends only the structured settings, none of the removed pool / bracket-size ones', () => {
    const form = structuredForm();

    expect(extractCompetitionConfiguration(form.controls.modeParameter)).toEqual({
      numberOfQualifyingRounds: 4,
      consolationCount: 2,
      hasChallenges: true,
      hasThirdPlaceMatch: false,
      eliminationSeeding: 'random',
    });
  });
});

describe('buildPlanPreviewBody', () => {
  it('previews the target count while creating', () => {
    expect(buildPlanPreviewBody(structuredForm({ target: 96 }), null)).toEqual({
      competitionMode: 'standard',
      competitionConfiguration: {
        numberOfQualifyingRounds: 4,
        consolationCount: 2,
        hasChallenges: true,
        hasThirdPlaceMatch: false,
      },
      teamCount: 96,
      targetCount: 96,
    });
  });

  it('previews the registered teams in draft edit, the target staying the target', () => {
    const body = buildPlanPreviewBody(structuredForm({ target: 128 }), 112);
    expect(body?.teamCount).toBe(112);
    expect(body?.targetCount).toBe(128);
  });

  it('falls back to the target while fewer than 2 teams are registered', () => {
    expect(buildPlanPreviewBody(structuredForm({ target: 64 }), 1)?.teamCount).toBe(64);
    expect(buildPlanPreviewBody(structuredForm({ target: 64 }), 0)?.teamCount).toBe(64);
  });

  it('asks for nothing outside the structured mode or with an invalid form', () => {
    expect(buildPlanPreviewBody(structuredForm({ mode: 'up_down' }), null)).toBeNull();
    expect(buildPlanPreviewBody(structuredForm({ qualifyingRounds: 0 }), null)).toBeNull();
  });
});

describe('planPreviewBodies', () => {
  afterEach(() => vi.useRealTimers());

  function watch(form: TournamentConfigurationForm, registered: BehaviorSubject<number | null>) {
    const bodies: PlanPreviewBody[] = [];
    const subscription = planPreviewBodies(form, registered)
      .pipe(debounceTime(PLAN_PREVIEW_DEBOUNCE_MS))
      .subscribe((body) => bodies.push(body));
    return { bodies, subscription };
  }

  it('emits one body after 300 ms for a burst of changes, and none for an unchanged value', () => {
    vi.useFakeTimers();
    const form = structuredForm({ target: 128 });
    const { bodies, subscription } = watch(form, new BehaviorSubject<number | null>(null));

    vi.advanceTimersByTime(300);
    expect(bodies.length).toBe(1);

    form.controls.rules.controls.maxTeamCapacity.setValue(100);
    vi.advanceTimersByTime(200);
    form.controls.rules.controls.maxTeamCapacity.setValue(96);
    vi.advanceTimersByTime(299);
    expect(bodies.length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(bodies.length).toBe(2);
    expect(bodies[1].targetCount).toBe(96);

    form.controls.rules.controls.maxTeamCapacity.setValue(96);
    vi.advanceTimersByTime(1000);
    expect(bodies.length).toBe(2);
    subscription.unsubscribe();
  });

  it('previews again when the registered teams change', () => {
    vi.useFakeTimers();
    const registered = new BehaviorSubject<number | null>(112);
    const { bodies, subscription } = watch(structuredForm({ target: 128 }), registered);
    vi.advanceTimersByTime(300);

    registered.next(113);
    vi.advanceTimersByTime(300);

    expect(bodies.map((body) => body.teamCount)).toEqual([112, 113]);
    subscription.unsubscribe();
  });

  it('stays silent while the form cannot be previewed', () => {
    vi.useFakeTimers();
    const { bodies, subscription } = watch(
      structuredForm({ qualifyingRounds: 0 }),
      new BehaviorSubject<number | null>(null),
    );

    vi.advanceTimersByTime(1000);

    expect(bodies).toEqual([]);
    subscription.unsubscribe();
  });
});
