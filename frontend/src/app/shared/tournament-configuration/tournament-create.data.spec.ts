import { describe, expect, it } from 'vitest';
import { scoreCalculationOptions } from './tournament-create.data';

const TIE_RULE = 'Égalité parfaite';

function fullText(value: string): string {
  const option = scoreCalculationOptions.find((candidate) => candidate.value === value);
  return `${option?.description ?? ''} ${option?.htmlDescription ?? ''}`;
}

describe('scoreCalculationOptions', () => {
  it('offers the three victory-based calculations then the championship points, in that order', () => {
    expect(scoreCalculationOptions.map((option) => option.value)).toEqual([
      'victory_goal_average',
      'victory_best_defeats',
      'victory_points_scored',
      'tournament_score',
    ]);
  });

  it('labels the calculations', () => {
    expect(scoreCalculationOptions.map((option) => option.label)).toEqual([
      'Victoires, puis goal-average',
      'Victoires, puis meilleures défaites',
      'Victoires, puis points marqués',
      'Points championnat',
    ]);
  });

  it.each([
    ['victory_goal_average', 'A finit à +25, B à +18'],
    ['victory_best_defeats', 'A a perdu au pire 11-13, B 4-13'],
    ['victory_points_scored', 'A a marqué 78 points, B 74'],
  ])('explains %s with its criteria, an example and the tie rule', (value, example) => {
    const text = fullText(value);
    expect(text).toContain('Nombre de victoires');
    expect(text).toContain("Écart de la dernière partie, puis de l'avant-dernière");
    expect(text).toContain(example);
    expect(text).toContain(TIE_RULE);
    expect(text).toContain('tirage au sort neutre, fait par PaletHop');
  });

  it('describes the criteria of each calculation in its own order', () => {
    expect(fullText('victory_goal_average')).toContain(
      'Goal-average (points marqués moins points encaissés)',
    );
    expect(fullText('victory_best_defeats')).toContain(
      'Pire défaite (celui qui a le mieux résisté passe devant)',
    );
    expect(fullText('victory_points_scored')).toContain('Points encaissés (le moins passe devant)');
  });

  it('keeps the championship points without the tie rule', () => {
    const text = fullText('tournament_score');
    expect(text).toContain('Victoire = 6pts');
    expect(text).not.toContain(TIE_RULE);
  });
});
