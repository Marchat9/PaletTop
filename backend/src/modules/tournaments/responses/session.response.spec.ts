import { describe, expect, it } from 'vitest';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { toSessionResponseDto } from './session.response';

describe('toSessionResponseDto', () => {
    it('never exposes the team codes, which are the teams credentials', () => {
        const session = {
            id: 'session-1',
            sessionNumber: 1,
            status: 'OPEN',
            matches: [
                {
                    id: 'match-1',
                    status: 'PENDING',
                    isBye: false,
                    scoreA: 0,
                    scoreB: 0,
                    teamA: { id: 'team-a', name: 'A', code: '1111' },
                    teamB: { id: 'team-b', name: 'B', code: '2222' },
                } as unknown as TournamentMatch,
            ],
        } as MatchesSession;

        const dto = toSessionResponseDto(session, true);

        expect(JSON.stringify(dto)).not.toContain('1111');
        expect(JSON.stringify(dto)).not.toContain('2222');
        expect(dto.matches[0].teamA).toEqual({ id: 'team-a', name: 'A' });
    });

    it('tells the clients whether the round was drawn', () => {
        const session = {
            id: 's',
            sessionNumber: 5,
            status: 'CLOSED',
            matches: [],
        } as unknown as MatchesSession;

        expect(toSessionResponseDto(session, true).isDrawnRound).toBe(true);
        expect(toSessionResponseDto(session, false).isDrawnRound).toBe(false);
    });
});
