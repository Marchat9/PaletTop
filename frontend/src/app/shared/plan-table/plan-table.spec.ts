import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  PlanBracket,
  PlanGroup,
  PlanGroupKind,
  PlanRound,
  TournamentPlan,
} from 'src/app/models/tournament-plan.model';
import { PlanTable } from './plan-table';

function group(
  key: string,
  label: string,
  kind: PlanGroupKind,
  teamCount: number,
  extra: Partial<PlanGroup> = {},
): PlanGroup {
  return {
    key,
    label,
    kind,
    teamCount,
    matchCount: Math.floor(teamCount / 2),
    byeCount: 0,
    plateStart: 1,
    plateEnd: Math.floor(teamCount / 2),
    ...extra,
  };
}

function bracket(key: string, label: string, capacity: number, teamCount: number): PlanBracket {
  return {
    key,
    label,
    capacity,
    teamCount,
    fillRatio: teamCount / capacity,
    fillLevel: teamCount === capacity ? 'ok' : 'mid',
    extra: false,
  };
}

function qualifying(number: number): PlanRound {
  return {
    number,
    kind: 'qualifying',
    label: `Phase qualificative ${number}/3`,
    groups: [group('qualifying', 'Phase qualificative', 'qualifying', 120)],
  };
}

function elimination(number: number, label: string, groups: PlanGroup[]): PlanRound {
  return { number, kind: 'elimination', label, groups };
}

/** 120 teams: principale 64, consolante A 32, consolante B 24 / 32, with challenges and a 3rd place. */
function buildPlan(): TournamentPlan {
  const rounds: PlanRound[] = [
    qualifying(1),
    qualifying(2),
    qualifying(3),
    elimination(4, 'Élimination 1', [
      group('principale', 'Principale', 'main', 64),
      group('consolante_1', 'Consolante A', 'consolation', 32),
      group('consolante_2', 'Consolante B', 'consolation', 24, { byeCount: 8 }),
    ]),
    elimination(5, 'Élimination 2', [
      group('principale', 'Principale', 'main', 32),
      group('challenge_principale', 'Challenge principale', 'challenge', 32),
      group('consolante_1', 'Consolante A', 'consolation', 16),
      group('challenge_consolante_1', 'Challenge consolante A', 'challenge', 16),
      group('consolante_2', 'Consolante B', 'consolation', 16),
      group('challenge_consolante_2', 'Challenge consolante B', 'challenge', 8),
    ]),
    elimination(6, 'Élimination 3', [group('principale', 'Principale', 'main', 16)]),
    elimination(7, 'Quarts de finale', [group('principale', 'Principale', 'main', 8)]),
    elimination(8, 'Demi-finales', [group('principale', 'Principale', 'main', 4)]),
    elimination(9, 'Finale', [
      group('principale', 'Principale', 'main', 2),
      group('third_place', 'Match pour la 3e place', 'third_place', 2),
    ]),
  ];
  return {
    teamCount: 120,
    eliminatedAfterQualifying: 0,
    brackets: [
      bracket('principale', 'Principale', 64, 64),
      bracket('consolante_1', 'Consolante A', 32, 32),
      bracket('consolante_2', 'Consolante B', 32, 24),
    ],
    rounds,
    totalRounds: rounds.length,
    maxPlates: 60,
    warnings: [],
    comfort: null,
    options: [],
  };
}

interface PlanTableInputs {
  doneRounds?: number;
  currentRound?: number | null;
  minColumns?: number;
}

describe('PlanTable', () => {
  let fixture: ComponentFixture<PlanTable>;

  function create(inputs: PlanTableInputs = {}): HTMLElement {
    fixture = TestBed.createComponent(PlanTable);
    fixture.componentRef.setInput('plan', buildPlan());
    if (inputs.doneRounds !== undefined)
      fixture.componentRef.setInput('doneRounds', inputs.doneRounds);
    if (inputs.currentRound !== undefined)
      fixture.componentRef.setInput('currentRound', inputs.currentRound);
    if (inputs.minColumns !== undefined)
      fixture.componentRef.setInput('minColumns', inputs.minColumns);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const text = (el: Element | null | undefined): string =>
    (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

  it('renders one row per bracket plus the 3rd place and challenge sub-rows', () => {
    const root = create();

    const rows = root.querySelectorAll('tbody tr');
    expect(rows.length).toBe(7);
    expect(root.querySelectorAll('tbody tr.sub').length).toBe(4);
    const labels = Array.from(rows).map((row) => text(row.querySelector('th')));
    expect(labels[0]).toContain('Principale');
    expect(labels.some((l) => l.includes('3e place'))).toBe(true);
    expect(labels.some((l) => l.includes('Challenge consolante B'))).toBe(true);
  });

  it('renders one column per elimination round with its stage', () => {
    const root = create();

    const headers = Array.from(root.querySelectorAll('thead th')).map((th) => text(th));
    expect(headers).toEqual([
      'Tableau',
      'Élim. 1',
      'Élim. 2',
      'Élim. 3',
      'Élim. 4',
      'Élim. 5',
      'Élim. 6',
    ]);
    const principale = Array.from(root.querySelectorAll('tbody tr')[0].querySelectorAll('td')).map(
      (td) => text(td),
    );
    expect(principale).toEqual([
      '32 matchs',
      '16 matchs',
      '8 matchs',
      'Quarts',
      'Demies',
      'Finale',
    ]);
  });

  it('shows the byes of the first round in the first cell of the consolante B', () => {
    const root = create();

    const row = Array.from(root.querySelectorAll('tbody tr')).find((r) =>
      text(r.querySelector('th')).startsWith('Consolante B'),
    );
    expect(text(row?.querySelector('td'))).toContain('8 exempts');
  });

  it('adds up the plates of each round in the last row', () => {
    const root = create();

    const totals = Array.from(root.querySelectorAll('tfoot td')).map((td) => text(td));
    expect(text(root.querySelector('tfoot th'))).toBe('Plaques utilisées');
    // 32 + 16 + 12 | 16 + 16 + 8 + 8 + 8 + 4 | 8 | 4 | 2 | 1 + 1
    expect(totals).toEqual(['60', '60', '8', '4', '2', '2']);
  });

  it('pads empty columns up to minColumns', () => {
    const root = create({ minColumns: 8 });

    expect(root.querySelectorAll('thead th').length).toBe(1 + 8);
    expect(text(root.querySelectorAll('thead th')[8])).toBe('Élim. 8');
    expect(root.querySelectorAll('tbody tr')[0].querySelectorAll('td').length).toBe(8);
    expect(root.querySelectorAll('tfoot td').length).toBe(8);
  });

  it('describes the qualifying phase above the table', () => {
    const root = create();

    const line = text(root.querySelector('.plan-table__qualifying'));
    expect(line).toContain('Qualifs : 3 parties');
    expect(line).toContain('120 équipes');
    expect(line).toContain('60 matchs');
  });

  it('marks the finished and the current rounds', () => {
    const root = create({ doneRounds: 4, currentRound: 5 });

    const headers = root.querySelectorAll('thead th');
    expect(headers[1].classList.contains('done')).toBe(true);
    expect(text(headers[1])).toContain('✓');
    expect(headers[2].classList.contains('now')).toBe(true);
    expect(headers[3].classList.contains('done')).toBe(false);
  });

  it('scrolls horizontally when the mouse is dragged and stops on mouseup', () => {
    const root = create();
    const scroller = root.querySelector('.plan-table__scroll') as HTMLElement;
    scroller.scrollLeft = 0;

    scroller.dispatchEvent(new MouseEvent('mousedown', { clientX: 300, bubbles: true }));
    scroller.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, bubbles: true }));
    expect(scroller.scrollLeft).toBe(100);

    scroller.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    scroller.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, bubbles: true }));
    expect(scroller.scrollLeft).toBe(100);
  });
});
