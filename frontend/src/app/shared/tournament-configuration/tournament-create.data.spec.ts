import { describe, expect, it } from 'vitest';
import { scoreCalculationOptions } from './tournament-create.data';

const TIE_RULE = 'égalité parfaite';

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
      'Victoires & Goal Average',
      'Victoires & Meilleure défaite',
      'Victoires & Points marqués',
      'Points championnat',
    ]);
  });

  it.each(['victory_goal_average', 'victory_best_defeats', 'victory_points_scored'])(
    'explains %s with its criteria and the tie rule',
    (value) => {
      const text = fullText(value);
      expect(text).toContain('<li>Victoires</li>');
      expect(text).toContain("Écart de la dernière partie, puis de l'avant-dernière");
      expect(text).toContain(TIE_RULE);
      expect(text).toContain('tirage au sort neutre');
    },
  );

  it('describes the criteria of each calculation in its own order', () => {
    expect(fullText('victory_goal_average')).toContain(
      '<li>Victoires</li><li>Goal average</li><li>Points marqués</li>',
    );
    expect(fullText('victory_best_defeats')).toContain(
      '<li>Victoires</li><li>Meilleure défaite</li><li>Goal average</li><li>Points marqués</li>',
    );
    expect(fullText('victory_points_scored')).toContain(
      '<li>Victoires</li><li>Points marqués</li><li>Moins de points encaissés</li>',
    );
  });

  it('keeps the championship points without the tie rule', () => {
    const text = fullText('tournament_score');
    expect(text).toContain('Victoire = 6pts');
    expect(text).not.toContain(TIE_RULE);
  });
});
