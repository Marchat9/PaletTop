import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  PlanBracket,
  PlanGroup,
  PlanRound,
  PlanWarning,
  TournamentPlan,
} from 'src/app/models/tournament-plan.model';
import { PlanSimulation } from './plan-simulation';

function bracket(key: string, label: string, teamCount: number, extra = false): PlanBracket {
  return {
    key,
    label,
    capacity: 32,
    teamCount,
    fillRatio: teamCount / 32,
    fillLevel: 'ok',
    extra,
  };
}

function eliminationRound(number: number, teamCount: number): PlanRound {
  const group: PlanGroup = {
    key: 'principale',
    label: 'Principale',
    kind: 'main',
    teamCount,
    matchCount: Math.floor(teamCount / 2),
    byeCount: 0,
    plateStart: 1,
    plateEnd: Math.floor(teamCount / 2),
  };
  return { number, kind: 'elimination', label: `Élimination ${number}`, groups: [group] };
}

function plan(
  bracketCount: number,
  roundCount: number,
  warnings: PlanWarning[] = [],
): TournamentPlan {
  return {
    teamCount: 100,
    eliminatedAfterQualifying: 0,
    brackets: Array.from({ length: bracketCount }, (_, index) =>
      bracket(`b${index}`, `Tableau ${index}`, 32),
    ),
    rounds: Array.from({ length: roundCount }, (_, index) =>
      eliminationRound(index + 1, 2 ** (roundCount - index)),
    ),
    totalRounds: roundCount,
    maxPlates: 32,
    warnings,
    comfort: null,
    options: [],
  };
}

interface SimulationInputs {
  plan?: TournamentPlan | null;
  targetCount?: number;
  teamCount?: number;
  error?: string | null;
}

describe('PlanSimulation', () => {
  let fixture: ComponentFixture<PlanSimulation>;
  let emitted: number[];

  function create(inputs: SimulationInputs = {}): HTMLElement {
    fixture = TestBed.createComponent(PlanSimulation);
    fixture.componentRef.setInput('plan', inputs.plan === undefined ? plan(3, 6) : inputs.plan);
    fixture.componentRef.setInput('targetCount', inputs.targetCount ?? 96);
    fixture.componentRef.setInput('teamCount', inputs.teamCount ?? 100);
    fixture.componentRef.setInput('error', inputs.error ?? null);
    emitted = [];
    fixture.componentInstance.teamCountChange.subscribe((count) => emitted.push(count));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function click(root: HTMLElement, selector: string): void {
    (root.querySelector(selector) as HTMLElement).click();
  }

  function columnCount(root: HTMLElement): number {
    return root.querySelectorAll('app-plan-table thead th:not(.lab)').length;
  }

  it('emits one team more with the + button', () => {
    const root = create({ teamCount: 100 });
    click(root, '[aria-label="Une équipe de plus"]');
    expect(emitted).toEqual([101]);
  });

  it('emits one team less with the - button', () => {
    const root = create({ teamCount: 100 });
    click(root, '[aria-label="Une équipe de moins"]');
    expect(emitted).toEqual([99]);
  });

  it('does not go below 2 or above 256', () => {
    let root = create({ teamCount: 2 });
    click(root, '[aria-label="Une équipe de moins"]');
    expect(emitted).toEqual([]);

    root = create({ teamCount: 256 });
    click(root, '[aria-label="Une équipe de plus"]');
    expect(emitted).toEqual([]);
  });

  it('clamps what the slider sends', () => {
    create({ teamCount: 100 });
    const input = fixture.nativeElement.querySelector('input[type="range"]') as HTMLInputElement;
    input.value = '300';
    input.dispatchEvent(new Event('input'));
    expect(emitted).toEqual([256]);
  });

  it('jumps to the target with « Nombre visé »', () => {
    const root = create({ teamCount: 100, targetCount: 96 });
    click(root, 'app-button .button');
    expect(emitted).toEqual([96]);
  });

  it('shows the surplus above the target', () => {
    const root = create({ teamCount: 100, targetCount: 96 });
    expect(root.querySelector('.plan-simulation__gap')?.textContent).toContain(
      '4 équipes de plus que le nombre visé',
    );
  });

  it('always renders 4 chip slots, with placeholders when there are 3 brackets', () => {
    const root = create({ plan: plan(3, 6) });
    expect(root.querySelectorAll('.bracket-chip')).toHaveLength(3);
    expect(root.querySelectorAll('.bracket-chip--slot')).toHaveLength(1);
  });

  it('renders the 4 chip slots before any plan arrives', () => {
    const root = create({ plan: null });
    expect(root.querySelectorAll('.bracket-chip--slot')).toHaveLength(4);
  });

  it('always renders the message slot, filled or not', () => {
    let root = create({ plan: null });
    expect(root.querySelector('.plan-simulation__message')).not.toBeNull();
    expect(root.querySelector('app-inline-notice')).toBeNull();

    root = create({ plan: plan(3, 6) });
    expect(root.querySelector('.plan-simulation__message app-inline-notice')).not.toBeNull();
  });

  it('shows an error in place of the plan message', () => {
    const root = create({ error: 'Calcul impossible' });
    expect(root.querySelector('.plan-simulation__message')?.textContent).toContain(
      'Calcul impossible',
    );
  });

  it('only shows the columns the plan needs, without padding', () => {
    const smaller = columnCount(create({ plan: plan(3, 6), teamCount: 100 }));
    const larger = columnCount(create({ plan: plan(3, 7), teamCount: 128 }));
    expect(smaller).toBeGreaterThan(0);
    expect(smaller).toBeLessThan(8);
    expect(larger).toBeGreaterThanOrEqual(smaller);
  });
});
