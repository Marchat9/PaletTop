import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ClubLeaderboardTable } from './club-leaderboard-table';

function setup(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(ClubLeaderboardTable);
  Object.entries(inputs).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ClubLeaderboardTable', () => {
  it('liste les membres dans l’ordre reçu, avec leur rang', () => {
    const element = setup({
      entries: [
        { memberId: 'M2', name: 'Marie', wins: 4, points: 52 },
        { memberId: 'M1', name: 'Jean', wins: 2, points: 40 },
      ],
    });

    const rows = Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['1', 'Marie', '4', '52'],
      ['2', 'Jean', '2', '40'],
    ]);
  });

  it('met en surbrillance la ligne du membre qui lit le classement', () => {
    const element = setup({
      entries: [
        { memberId: 'M2', name: 'Marie', wins: 4, points: 52 },
        { memberId: 'M1', name: 'Jean', wins: 2, points: 40 },
      ],
      myMemberId: 'M1',
    });

    const rows = element.querySelectorAll('tbody tr');
    expect(rows[0].classList).not.toContain('is-me');
    expect(rows[1].classList).toContain('is-me');
  });

  it('ne marque personne sans membre lecteur (invité, admin non joueur)', () => {
    const element = setup({
      entries: [{ memberId: 'M1', name: 'Jean', wins: 2, points: 40 }],
      myMemberId: null,
    });

    expect(element.querySelector('.is-me')).toBeNull();
  });

  it('indique qu’aucun membre n’a de match validé, les invités n’étant pas comptés', () => {
    expect(setup({ entries: [] }).textContent).toContain(
      "Aucun membre du club n'a encore de match validé (les invités ne sont pas comptés).",
    );
  });

  it('affiche l’erreur de chargement', () => {
    expect(setup({ entries: [], error: 'Séance introuvable.' }).textContent).toContain(
      'Séance introuvable.',
    );
  });
});
