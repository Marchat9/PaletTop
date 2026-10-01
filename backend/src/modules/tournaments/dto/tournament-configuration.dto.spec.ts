import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CompetitionMode, ScoreCalculation } from 'src/enum/tounament.enum';
import { TournamentConfigurationDto } from './tournament-configuration.dto';

function validate(config: Record<string, unknown>): string[] {
    const instance = plainToInstance(TournamentConfigurationDto, config);
    return validateSync(instance, { whitelist: true, forbidNonWhitelisted: true }).flatMap(
        (error) => Object.keys(error.constraints ?? {}),
    );
}

const structuredConfig = {
    maxTeamCapacity: 16,
    scoreCalculation: ScoreCalculation.VICTORY_AND_GOAL_AVERAGE,
    pointsPerGame: 13,
    competitionMode: CompetitionMode.STANDARD,
    competitionConfiguration: {
        hasConsolanteTable: true,
        hasChallengePrincipaleTable: true,
        hasChallengeConsolanteTable: true,
        hasThirdPlaceMatch: true,
        numberOfQualifyingRounds: 2,
        numberOfPools: 2,
    },
};

describe('TournamentConfigurationDto', () => {
    it('accepte une configuration structurée valide', () => {
        expect(validate(structuredConfig)).toEqual([]);
    });

    it('rejette un mode de calcul de score inconnu', () => {
        expect(validate({ ...structuredConfig, scoreCalculation: 'nope' })).toContain('isEnum');
    });

    it('rejette pointsPerGame en dessous de 1', () => {
        expect(validate({ ...structuredConfig, pointsPerGame: 0 })).toContain('min');
    });

    // The nested config is validated against the mode: bad inner fields are caught.
    it('rejette une config structurée avec des bornes invalides', () => {
        const bad = {
            ...structuredConfig,
            competitionConfiguration: {
                ...structuredConfig.competitionConfiguration,
                numberOfQualifyingRounds: 0,
                numberOfPools: 0,
            },
        };
        expect(validate(bad)).toContain('competitionConfiguration');
    });

    it('rejette une configuration de championnat sans club', () => {
        const championship = {
            ...structuredConfig,
            competitionMode: CompetitionMode.CHAMPIONSHIP,
            competitionConfiguration: { homeClub: 'Nantes' },
        };
        expect(validate(championship)).toContain('competitionConfiguration');
    });

    it('accepte une configuration de championnat valide', () => {
        const championship = {
            ...structuredConfig,
            competitionMode: CompetitionMode.CHAMPIONSHIP,
            competitionConfiguration: { homeClub: 'Nantes', awayClub: 'Rennes' },
        };
        expect(validate(championship)).toEqual([]);
    });

    // principalBracketSize is not rejected here (any integer passes); an invalid value is corrected
    // to the automatic size at tournament start, not at validation time.
    it('laisse passer un principalBracketSize non puissance de deux', () => {
        const withOddBracket = {
            ...structuredConfig,
            competitionConfiguration: {
                ...structuredConfig.competitionConfiguration,
                principalBracketSize: 7,
            },
        };
        expect(validate(withOddBracket)).toEqual([]);
    });

    describe('montée / descente — dernière partie au classement', () => {
        function upDown(competitionConfiguration: Record<string, unknown>) {
            return {
                ...structuredConfig,
                competitionMode: CompetitionMode.UP_DOWN,
                competitionConfiguration,
            };
        }

        it('accepte l’option avec au moins 2 parties', () => {
            expect(validate(upDown({ numberOfRound: 2, lastRoundByRanking: true }))).toEqual([]);
        });

        it('accepte l’option décochée sans nombre de parties', () => {
            expect(validate(upDown({ lastRoundByRanking: false }))).toEqual([]);
        });

        it('rejette l’option sans nombre de parties ou avec une seule partie', () => {
            expect(validate(upDown({ lastRoundByRanking: true }))).toContain(
                'competitionConfiguration',
            );
            expect(validate(upDown({ numberOfRound: 1, lastRoundByRanking: true }))).toContain(
                'competitionConfiguration',
            );
        });

        it('rejette une valeur non booléenne', () => {
            expect(validate(upDown({ numberOfRound: 5, lastRoundByRanking: 'oui' }))).toContain(
                'competitionConfiguration',
            );
        });
    });
});
