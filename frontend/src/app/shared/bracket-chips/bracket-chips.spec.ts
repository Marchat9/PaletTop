import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanBracket } from 'src/app/models/tournament-plan.model';
import { BracketChips } from './bracket-chips';

function bracket(overrides: Partial<PlanBracket>): PlanBracket {
  return {
    key: 'principale',
    label: 'Principale',
    capacity: 64,
    teamCount: 64,
    fillRatio: 1,
    fillLevel: 'ok',
    extra: false,
    bestLosersFirstRound: 0,
    ...overrides,
  };
}

interface BracketChipsInputs {
  brackets: PlanBracket[];
  slots?: number;
  dense?: boolean;
  columns?: number;
}

describe('BracketChips', () => {
  let fixture: ComponentFixture<BracketChips>;

  function create(inputs: BracketChipsInputs): HTMLElement {
    fixture = TestBed.createComponent(BracketChips);
    fixture.componentRef.setInput('brackets', inputs.brackets);
    if (inputs.slots !== undefined) fixture.componentRef.setInput('slots', inputs.slots);
    if (inputs.dense !== undefined) fixture.componentRef.setInput('dense', inputs.dense);
    if (inputs.columns !== undefined) fixture.componentRef.setInput('columns', inputs.columns);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const text = (el: Element | null | undefined): string =>
    (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const brackets = [
    bracket({}),
    bracket({
      key: 'consolante_1',
      label: 'Consolante A',
      capacity: 32,
      teamCount: 24,
      fillRatio: 0.75,
      fillLevel: 'mid',
      bestLosersFirstRound: 4,
    }),
  ];

  it('shows the name, count / capacity and the best losers of a partial bracket', () => {
    const root = create({ brackets });

    const chips = root.querySelectorAll('.bracket-chip');
    expect(chips.length).toBe(2);
    expect(text(chips[1])).toContain('Consolante A');
    expect(text(chips[1])).toContain('24 / 32');
    expect(text(chips[1])).toContain('+4 meilleurs perdants');
  });

  it('shows a full bracket as complete, without capacity', () => {
    const root = create({ brackets });

    const first = root.querySelector('.bracket-chip');
    expect(text(first)).toContain('64');
    expect(text(first)).not.toContain('/');
    expect(text(first)).toContain('Complet');
  });

  it('does not claim a partial bracket without best losers is complete', () => {
    const root = create({
      brackets: [bracket({ capacity: 32, teamCount: 24, fillRatio: 0.75, fillLevel: 'mid' })],
    });

    const detail = root.querySelector('.bracket-chip__detail');
    expect(text(detail)).toBe('');
    expect(text(root)).not.toContain('Complet');
  });

  it('colors the bar by fill level and sizes it by the fill ratio', () => {
    const root = create({ brackets });

    const bars = root.querySelectorAll<HTMLElement>('.bracket-chip__bar i');
    expect(bars[0].classList.contains('ok')).toBe(true);
    expect(bars[1].classList.contains('mid')).toBe(true);
    expect(bars[1].style.width).toBe('75%');
  });

  it('uses the singular for one best loser and flags the extra bracket', () => {
    const root = create({
      brackets: [
        bracket({ extra: true, label: 'Consolante B', teamCount: 31, bestLosersFirstRound: 1 }),
      ],
    });

    expect(text(root)).toContain('Consolante B (en plus)');
    expect(text(root)).toContain('+1 meilleur perdant');
    expect(text(root)).not.toContain('meilleurs perdants');
  });

  it('fills the missing slots with dashed placeholders', () => {
    const root = create({ brackets, slots: 4 });

    expect(root.querySelectorAll('.bracket-chip').length).toBe(2);
    expect(root.querySelectorAll('.bracket-chip--slot').length).toBe(2);
  });

  it('adds the dense modifier', () => {
    const root = create({ brackets, dense: true });

    expect(root.querySelector('.bracket-chips')?.classList.contains('dense')).toBe(true);
  });

  it('fixes the number of cards per row when asked', () => {
    const root = create({ brackets, columns: 3 });

    expect((root.querySelector('.bracket-chips') as HTMLElement).style.gridTemplateColumns).toBe(
      'repeat(3, minmax(0, 1fr))',
    );
  });
});
