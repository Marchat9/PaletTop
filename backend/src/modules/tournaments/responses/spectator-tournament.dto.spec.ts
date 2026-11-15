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
            teamNames: [],
        });
    });

    it('lists the registered teams in natural order (Équipe 2 before Équipe 11)', () => {
        const tournament = {
            configuration: { scoreCalculation: ScoreCalculation.SCORE },
            teams: [{ name: 'Équipe 11' }, { name: 'Les Fondus' }, { name: 'Équipe 2' }],
        } as Tournament;

        expect(toSpectatorTournamentDto(tournament, '').teamNames).toEqual([
            'Équipe 2',
            'Équipe 11',
            'Les Fondus',
        ]);
    });
});
