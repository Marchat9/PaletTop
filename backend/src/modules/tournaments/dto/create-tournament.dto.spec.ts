import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { ValidationError, validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CompetitionMode, ScoreCalculation } from 'src/enum/tounament.enum';
import { CreateTournamentDto } from './create-tournament.dto';
import { UpdateTournamentConfigurationDto } from './update-tournament-configuration.dto';

function errorPaths(errors: ValidationError[], prefix = ''): string[] {
    return errors.flatMap((error) => {
        const path = prefix ? `${prefix}.${error.property}` : error.property;
        return error.children?.length ? errorPaths(error.children, path) : [path];
    });
}

function validate<T extends object>(cls: new () => T, body: Record<string, unknown>): string[] {
    return errorPaths(
        validateSync(plainToInstance(cls, body), { whitelist: true, forbidNonWhitelisted: true }),
    );
}

const configuration = {
    maxTeamCapacity: 16,
    scoreCalculation: ScoreCalculation.VICTORY_AND_GOAL_AVERAGE,
    pointsPerGame: 13,
    competitionMode: CompetitionMode.STANDARD,
    competitionConfiguration: {
        hasConsolanteTable: false,
        hasChallengePrincipaleTable: false,
        hasChallengeConsolanteTable: false,
        hasThirdPlaceMatch: false,
        numberOfQualifyingRounds: 2,
    },
};

const createBody = {
    name: 'Open',
    code: 'OPEN-2026',
    adminPassword: 'pw',
    date: '2026-11-02',
    configuration,
};

describe('CreateTournamentDto', () => {
    it('accepts a valid tournament', () => {
        expect(validate(CreateTournamentDto, createBody)).toEqual([]);
    });

    it.each([
        ['a zero points target', { pointsPerGame: 0 }, 'configuration.pointsPerGame'],
        ['a negative capacity', { maxTeamCapacity: -5 }, 'configuration.maxTeamCapacity'],
        ['an unknown mode', { competitionMode: 'bogus' }, 'configuration.competitionMode'],
        [
            'championship without its configuration',
            { competitionMode: CompetitionMode.CHAMPIONSHIP },
            'configuration.competitionConfiguration',
        ],
        ['an extra nested field', { evil: 1 }, 'configuration.evil'],
        [
            'the same club at home and away',
            {
                competitionMode: CompetitionMode.CHAMPIONSHIP,
                competitionConfiguration: { homeClub: 'Club A', awayClub: ' club a ' },
            },
            'configuration.competitionConfiguration',
        ],
    ])('rejects %s in the nested configuration', (_label, override, path) => {
        const body = { ...createBody, configuration: { ...configuration, ...override } };
        expect(validate(CreateTournamentDto, body)).toContain(path);
    });
});

describe('UpdateTournamentConfigurationDto', () => {
    const { adminPassword: _adminPassword, ...rest } = createBody;
    const updateBody = { ...rest, password: 'pw' };

    it('accepts a valid update', () => {
        expect(validate(UpdateTournamentConfigurationDto, updateBody)).toEqual([]);
    });

    it('validates the nested configuration and the date', () => {
        const body = {
            ...updateBody,
            date: 'not-a-date',
            configuration: { ...configuration, pointsPerGame: -3 },
        };
        expect(validate(UpdateTournamentConfigurationDto, body)).toEqual(
            expect.arrayContaining(['date', 'configuration.pointsPerGame']),
        );
    });
});
