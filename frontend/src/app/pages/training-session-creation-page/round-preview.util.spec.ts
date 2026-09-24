import { describe, expect, it } from 'vitest';
import { describeRoundPreview, previewRound, RoundPreviewSettings } from './round-preview.util';

function settings(overrides: Partial<RoundPreviewSettings> = {}): RoundPreviewSettings {
  return {
    playersPerTeam: 2,
    allowedTeamSizes: [],
    preferTargetTeamSize: false,
    plateCount: 99,
    ...overrides,
  };
}

// Mêmes cas que `team-decomposition.spec.ts` côté serveur : les deux implémentations doivent
// répondre la même chose, sans quoi l'aperçu mentirait sur ce qui va être généré.
describe('previewRound', () => {
  it("forme des équipes à la taille visée quand l'effectif tombe juste", () => {
    expect(previewRound(8, settings())).toEqual({
      teamSizes: [2, 2, 2, 2],
      matchCount: 2,
      sitOutCount: 0,
    });
  });

  it('écarte les répartitions en nombre impair d’équipes', () => {
    expect(previewRound(6, settings())).toMatchObject({ teamSizes: [2, 2], sitOutCount: 2 });
  });

  it('utilise une taille de repli pour que tout le monde joue', () => {
    expect(previewRound(6, settings({ allowedTeamSizes: [1] }))).toMatchObject({
      teamSizes: [2, 2, 1, 1],
      sitOutCount: 0,
    });
  });

  it('préfère le repos à une taille différente quand l’arbitrage le demande', () => {
    expect(
      previewRound(6, settings({ allowedTeamSizes: [1], preferTargetTeamSize: true })),
    ).toMatchObject({ teamSizes: [2, 2], sitOutCount: 2 });
  });

  it('reste au plus près de la taille visée à effectif complet', () => {
    expect(previewRound(7, settings({ allowedTeamSizes: [1, 3] }))).toMatchObject({
      teamSizes: [2, 2, 2, 1],
      sitOutCount: 0,
    });
  });

  it('ne dépasse jamais le nombre de plaques', () => {
    expect(previewRound(20, settings({ plateCount: 3 }))).toMatchObject({
      matchCount: 3,
      sitOutCount: 8,
    });
  });

  it('renonce quand aucun match n’est possible', () => {
    expect(previewRound(3, settings())).toBeNull();
    expect(previewRound(1, settings())).toBeNull();
  });
});

describe('describeRoundPreview', () => {
  it('décrit les matchs qui seraient joués', () => {
    expect(describeRoundPreview(7, settings({ allowedTeamSizes: [1, 3] }), 'present')).toBe(
      'Avec 7 joueurs présents, ces réglages donneraient 2 matchs (2v2, 2v1) et personne au repos.',
    );
  });

  it('parle du roster sur la page de création', () => {
    expect(describeRoundPreview(6, settings(), 'roster')).toBe(
      'Avec vos 6 membres, ces réglages donneraient 1 match (2v2) et 2 au repos.',
    );
  });

  it('explique pourquoi aucun match n’est possible', () => {
    expect(describeRoundPreview(3, settings(), 'present')).toContain("aucun match n'est possible");
  });
});
