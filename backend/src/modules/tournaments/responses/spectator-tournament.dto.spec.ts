import { describe, expect, it } from 'vitest';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatus } from 'src/enum/status.enum';
import { ScoreCalculation } from 'src/enum/tounament.enum';
import { toSpectatorTournamentDto } from './spectator-tournament.dto';

describe('toSpectatorTournamentDto', () => {
    it('maps the public fields, ignoring adminPassword and other relations', () => {
        const tournament = {
            id: 'tournament-1',
            code: 'ABC123',
            name: 'Tournoi du Printemps',
            adminPassword: 'super-secret',
            status: TournamentStatus.ACTIVE,
            configuration: {
                scoreCalculation: ScoreCalculation.SCORE,
            },
        } as Tournament;

        const dto = toSpectatorTournamentDto(tournament, 'phaseName');

        expect(dto).toEqual({
            id: 'tournament-1',
            code: 'ABC123',
            name: 'Tournoi du Printemps',
            status: TournamentStatus.ACTIVE,
            phaseName: 'phaseName',
            scoreCalculation: ScoreCalculation.SCORE,
        });
    });
});
