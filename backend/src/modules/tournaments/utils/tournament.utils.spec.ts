import { describe, expect, it } from 'vitest';
import { Tournament } from 'src/entities/tournament.entity';
import { stripMatchTeamCodes } from './tournament.utils';

describe('stripMatchTeamCodes', () => {
    it('removes the codes of every match team, but keeps the teams list untouched', () => {
        const match = () => ({
            teamA: { id: 'a', name: 'A', code: '1111' },
            teamB: { id: 'b', name: 'B', code: '2222' },
        });
        const tournament = {
            teams: [{ id: 'a', name: 'A', code: '1111', matches: [match()] }],
            matches: [match()],
            matchsSessions: [{ matches: [match()] }],
        } as unknown as Tournament;

        stripMatchTeamCodes(tournament);

        const { teams, ...matchesOnly } = tournament;
        expect(JSON.stringify(matchesOnly)).not.toMatch(/1111|2222/);
        expect(JSON.stringify(teams[0])).not.toContain('2222');
        expect(teams[0].code).toBe('1111');
    });
});
