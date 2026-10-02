import { describe, expect, it } from 'vitest';
import { TournamentConfigurationDetailsDto } from 'src/app/models/tournament-configuration-detail.model';
import { buildTournamentRules } from './tournament-rules.util';

function configuration(
  overrides: Partial<TournamentConfigurationDetailsDto>,
): TournamentConfigurationDetailsDto {
  return {
    maxTeamCapacity: 16,
    scoreCalculation: 'victory_ga',
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

  it('liste les réglages communs et uniquement les options activées', () => {
    expect(labels(configuration({ rematch: true }))).toEqual([
      '13 points',
      'Victoire & Goal Average',
      'Rematch autorisés',
    ]);
  });

  it('liste les tableaux actifs du tournoi structuré', () => {
    const result = labels(
      configuration({
        competitionConfiguration: {
          numberOfQualifyingRounds: 4,
          numberOfPools: 2,
          hasConsolanteTable: true,
          hasChallengePrincipaleTable: false,
          hasThirdPlaceMatch: true,
        },
      }),
    );
    expect(result).toEqual(
      expect.arrayContaining([
        '4 parties qualificatives',
        '2 poules',
        'Consolante',
        'Match pour la 3e place',
      ]),
    );
    expect(result).not.toContain('Challenge principale');
  });

  it('indique le nombre de parties et la dernière partie au classement en montée / descente', () => {
    const result = labels(
      configuration({
        competitionMode: 'up_down',
        competitionConfiguration: { numberOfRound: 5, lastRoundByRanking: true },
      }),
    );
    expect(result).toEqual(expect.arrayContaining(['5 parties', 'Dernière partie au classement']));
  });

  it('indique des parties illimitées sans nombre de parties', () => {
    const result = labels(
      configuration({ competitionMode: 'up_down', competitionConfiguration: {} }),
    );
    expect(result).toContain('Parties illimitées');
    expect(result).not.toContain('Dernière partie au classement');
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
