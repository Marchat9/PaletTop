import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Tournament } from 'src/entities/tournament.entity';
import { AppSettingKey } from 'src/enum/app-setting.enum';
import { TournamentStatus } from 'src/enum/status.enum';
import { CompetitionMode, ScoreCalculation } from 'src/enum/tounament.enum';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { AddMultipleTeamsToTournamentDto } from '../dto/add-team-to-tournament.dto';
import { UpdateTournamentConfigurationDto } from '../dto/update-tournament-configuration.dto';
import { TournamentStrategyFactory } from '../strategies/tournament-strategy.factory';
import { TournamentsService } from './tournaments.service';

const MAX_CONSOLATIONS = 4;

const structuredCompetition = {
    numberOfQualifyingRounds: 4,
    consolationCount: 1,
    hasChallenges: false,
    hasThirdPlaceMatch: false,
};

function configuration(
    competitionMode: CompetitionMode,
    competitionConfiguration: object,
    maxTeamCapacity = 8,
) {
    return {
        maxTeamCapacity,
        scoreCalculation: ScoreCalculation.VICTORY_GOAL_AVERAGE,
        pointsPerGame: 13,
        competitionMode,
        competitionConfiguration,
    };
}

function setup(stored: Partial<Tournament> = {}) {
    const tournament = {
        id: 'T1',
        code: 'OPEN',
        name: 'Open',
        status: TournamentStatus.DRAFT,
        teams: [],
        configuration: configuration(CompetitionMode.STANDARD, structuredCompetition),
        ...stored,
    } as unknown as Tournament;

    const tournamentRepo = {
        create: vi.fn((data: object) => data),
        save: vi.fn(async (data: object) => data),
        findByCode: vi.fn(async () => null),
    };
    const teamRepo = {
        create: vi.fn((data: object) => data),
        save: vi.fn(async (teams: object[]) => teams),
    };
    const playerClubRepo = { findOrCreateMany: vi.fn(async () => new Map()) };
    const authService = { findWithAdminAuth: vi.fn(async () => tournament) };
    const appSettings = {
        get: vi.fn(async (key: AppSettingKey) => {
            if (key === AppSettingKey.MAX_CONSOLATION_COUNT) return MAX_CONSOLATIONS;
            if (key === AppSettingKey.SCORE_CALCULATIONS_BY_MODE) {
                return Object.fromEntries(
                    Object.values(CompetitionMode).map((mode) => [
                        mode,
                        Object.values(ScoreCalculation),
                    ]),
                );
            }
            throw new Error(`unexpected setting ${key}`);
        }),
    };
    const adminPassword = { hash: vi.fn(async () => 'hash') };
    const factory = new TournamentStrategyFactory(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
    );

    const service = new TournamentsService(
        tournamentRepo as never,
        teamRepo as never,
        playerClubRepo as never,
        authService as never,
        {} as never,
        factory,
        {} as never,
        appSettings as never,
        adminPassword as never,
    );
    return { service, tournament, tournamentRepo };
}

function teams(count: number) {
    return Array.from({ length: count }, (_, i) => ({ name: `Team ${i}`, players: [] }));
}

function registered(count: number) {
    return Array.from({ length: count }, (_, i) => ({ id: `t${i}`, code: `${1000 + i}` }));
}

describe('TournamentsService.addTeams capacity', () => {
    it('lets a structured tournament register above its target team count', async () => {
        const { service } = setup({ teams: registered(8) as never });
        const dto = { password: 'pw', teams: teams(3) } as AddMultipleTeamsToTournamentDto;

        const saved = await service.addTeams('OPEN', dto);
        expect(saved.teams).toHaveLength(11);
    });

    it('still caps a structured tournament at the absolute maximum of 256 teams', async () => {
        const { service } = setup({ teams: registered(255) as never });

        await expect(
            service.addTeams('OPEN', { password: 'pw', teams: teams(1) } as never),
        ).resolves.toBeDefined();
        await expect(
            service.addTeams('OPEN', { password: 'pw', teams: teams(1) } as never),
        ).rejects.toThrow('Capacité maximale atteinte : 256 équipes');
    });

    it('keeps the target as a hard cap for the up-down mode', async () => {
        const { service } = setup({
            teams: registered(8) as never,
            configuration: configuration(CompetitionMode.UP_DOWN, {}) as never,
        });

        await expect(
            service.addTeams('OPEN', { password: 'pw', teams: teams(1) } as never),
        ).rejects.toThrow(
            'Capacité maximale atteinte : 8 équipes pour ce tournoi (8 déjà inscrites).',
        );
    });
});

describe('TournamentsService max consolations', () => {
    function createDto(consolationCount: number): CreateTournamentDto {
        return {
            name: 'Open',
            code: 'OPEN',
            adminPassword: 'pw',
            date: new Date('2026-11-23'),
            configuration: configuration(CompetitionMode.STANDARD, {
                ...structuredCompetition,
                consolationCount,
            }),
        } as unknown as CreateTournamentDto;
    }

    function updateDto(consolationCount: number): UpdateTournamentConfigurationDto {
        const { adminPassword: _adminPassword, ...rest } = createDto(consolationCount);
        return { ...rest, password: 'pw' } as unknown as UpdateTournamentConfigurationDto;
    }

    it('refuses to create a tournament with more consolations than the setting', async () => {
        const { service, tournamentRepo } = setup();
        const creation = service.create(createDto(MAX_CONSOLATIONS + 1));

        await expect(creation).rejects.toThrow(BadRequestException);
        await expect(creation).rejects.toThrow(`Au maximum ${MAX_CONSOLATIONS} consolantes.`);
        expect(tournamentRepo.save).not.toHaveBeenCalled();
    });

    it('creates a tournament with as many consolations as the setting', async () => {
        const { service } = setup();
        const saved = await service.create(createDto(MAX_CONSOLATIONS));
        expect(saved.configuration.competitionConfiguration).toEqual({
            ...structuredCompetition,
            consolationCount: MAX_CONSOLATIONS,
            eliminationPairingMode: 'random',
            eliminationSeeding: 'pyramidal',
        });
    });

    it('refuses to update a tournament with more consolations than the setting', async () => {
        const { service, tournamentRepo } = setup();
        const update = service.updateTournamentConfiguration('T1', updateDto(MAX_CONSOLATIONS + 1));

        await expect(update).rejects.toThrow(`Au maximum ${MAX_CONSOLATIONS} consolantes.`);
        expect(tournamentRepo.save).not.toHaveBeenCalled();
    });

    // The update used to store the raw request: it now goes through the same extraction.
    it('stores only the extracted configuration on update', async () => {
        const { service } = setup();
        const dto = updateDto(2);
        dto.configuration.competitionConfiguration = {
            ...structuredCompetition,
            consolationCount: 2,
            plan: { teamCount: 3 },
            eliminatedAfterQualifying: 2,
        } as never;

        const saved = await service.updateTournamentConfiguration('T1', dto);
        expect(saved.configuration.competitionConfiguration).toEqual({
            ...structuredCompetition,
            consolationCount: 2,
            eliminationPairingMode: 'random',
            eliminationSeeding: 'pyramidal',
        });
    });
});
