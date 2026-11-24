import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { BracketRepechedList } from 'src/app/utils/repeched.util';
import { RepechedList } from './repeched-list';

const BRACKETS: BracketRepechedList[] = [
  {
    key: 'consolante_2',
    label: 'Consolante B',
    teams: [
      { teamId: 'a', teamName: 'Fer et Fier', defeat: '10–11', margin: 1 },
      { teamId: 'b', teamName: 'Les Galettes', defeat: '9–11', margin: 2 },
    ],
  },
];

describe('RepechedList', () => {
  it('lists each bracket with its repêchés and their defeat', () => {
    const fixture = TestBed.createComponent(RepechedList);
    fixture.componentRef.setInput('brackets', BRACKETS);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();

    expect(clean(root.querySelector('.bracket-title')?.textContent)).toBe(
      'Consolante B · 2 repêchés',
    );
    const rows = Array.from(root.querySelectorAll('.team')).map((row) => [
      clean(row.querySelector('.team-name')?.textContent),
      clean(row.querySelector('.team-defeat')?.textContent),
    ]);
    expect(rows).toEqual([
      ['Fer et Fier', 'défaite 10–11'],
      ['Les Galettes', 'défaite 9–11'],
    ]);
  });
});
