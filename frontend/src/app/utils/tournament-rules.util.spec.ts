import { describe, expect, it } from 'vitest';
import { TournamentConfigurationDetailsDto } from 'src/app/models/tournament-configuration-detail.model';
import { buildTournamentRules } from './tournament-rules.util';

function configuration(
  overrides: Partial<TournamentConfigurationDetailsDto>,
): TournamentConfigurationDetailsDto {
  return {
    maxTeamCapacity: 16,
    scoreCalculation: 'victory_goal_average',
    pointsPerGame: 13,
    rematch: false,
    matchAgainstFullSameClub: false,
    matchAgainstPartialSameClub: false,
    competitionMode: 'standard',
    competitionConfiguration: {},
    ...overrides,
  };
}

function labels(config: TournamentConfigurationDetailsDto): string[] {
  return buildTournamentRules(config).map((rule) => rule.label);
}

describe('buildTournamentRules', () => {
  it('ne renvoie rien sans configuration', () => {
    expect(buildTournamentRules(null)).toEqual([]);
  });

  it('liste les réglages communs, le mode choisi et uniquement les options activées', () => {
    expect(labels(configuration({ rematch: true }))).toEqual([
      '13 points',
      'Victoires & Goal Average',
      'Élimination : placement pyramidal',
      'Rematch autorisés',
    ]);
  });

  it('liste les tableaux actifs du tournoi structuré', () => {
    const result = labels(
      configuration({
        competitionConfiguration: {
          numberOfQualifyingRounds: 4,
          consolationCount: 2,
          hasChallenges: false,
          hasThirdPlaceMatch: true,
        },
      }),
    );
    expect(result).toEqual(
      expect.arrayContaining([
        '4 parties qualificatives',
        '2 consolantes',
        'Match pour la 3e place',
      ]),
    );
    expect(result).not.toContain('Challenges');
  });

  it('accorde la consolante au singulier et indique les challenges', () => {
    const result = labels(
      configuration({
        competitionConfiguration: {
          numberOfQualifyingRounds: 3,
          consolationCount: 1,
          hasChallenges: true,
        },
      }),
    );
    expect(result).toEqual(expect.arrayContaining(['1 consolante', 'Challenges']));
  });

  it('indique le nombre de parties et la dernière partie figée en montée / descente', () => {
    const result = labels(
      configuration({
        competitionMode: 'up_down',
        competitionConfiguration: { numberOfRound: 5, lastRoundByRanking: true },
      }),
    );
    expect(result).toEqual(expect.arrayContaining(['5 parties', 'Dernière partie figée']));
  });

  it('indique des parties illimitées sans nombre de parties', () => {
    const result = labels(
      configuration({ competitionMode: 'up_down', competitionConfiguration: {} }),
    );
    expect(result).toContain('Parties illimitées');
    expect(result).not.toContain('Dernière partie figée');
  });

  it('indique le mode Gagnant/Perdant quand il est choisi', () => {
    const dutch = labels(
      configuration({
        competitionMode: 'up_down',
        competitionConfiguration: { numberOfRound: 4, pairingMode: 'dutch' },
      }),
    );
    expect(dutch).toContain('Gagnant/Perdant');

    const random = labels(
      configuration({
        competitionMode: 'up_down',
        competitionConfiguration: { numberOfRound: 4, pairingMode: 'random' },
      }),
    );
    expect(random).not.toContain('Gagnant/Perdant');
    expect(random).toContain('Appariement aléatoire');
  });

  it('indique l’appariement aléatoire quand le mode est absent (anciens tournois)', () => {
    const legacy = labels(
      configuration({ competitionMode: 'up_down', competitionConfiguration: { numberOfRound: 4 } }),
    );
    expect(legacy).toContain('Appariement aléatoire');
  });

  it('indique les voisins de classement quand ils sont choisis', () => {
    const neighbors = labels(
      configuration({
        competitionMode: 'up_down',
        competitionConfiguration: { numberOfRound: 4, pairingMode: 'neighbors' },
      }),
    );
    expect(neighbors).toContain('Voisins de classement');
    expect(neighbors).not.toContain('Gagnant/Perdant');
  });

  it('indique le placement de l’élimination, aléatoire comme pyramidal', () => {
    const random = labels(
      configuration({
        competitionConfiguration: {
          numberOfQualifyingRounds: 3,
          consolationCount: 0,
          eliminationSeeding: 'random',
        },
      }),
    );
    expect(random).toContain('Élimination : placement aléatoire');

    const pyramidal = labels(
      configuration({
        competitionConfiguration: {
          numberOfQualifyingRounds: 3,
          consolationCount: 0,
          eliminationSeeding: 'pyramidal',
        },
      }),
    );
    expect(pyramidal).toContain('Élimination : placement pyramidal');
    expect(pyramidal).not.toContain('Élimination : placement aléatoire');

    const legacy = labels(
      configuration({
        competitionConfiguration: { numberOfQualifyingRounds: 3, consolationCount: 0 },
      }),
    );
    expect(legacy).toContain('Élimination : placement pyramidal');
  });

  it('indique les deux clubs du championnat', () => {
    const result = labels(
      configuration({
        competitionMode: 'championship',
        competitionConfiguration: { homeClub: 'Nantes', awayClub: 'Rennes' },
      }),
    );
    expect(result).toContain('Nantes contre Rennes');
  });
});
