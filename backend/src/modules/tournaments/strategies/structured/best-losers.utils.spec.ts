import { describe, expect, it } from 'vitest';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { GlobalRankingEntry } from '../../responses/ranking.dto';
import { BestLoserContext, LoserCandidate, rankBestLosers } from './best-losers.utils';

function team(id: string): Team {
    return { id, name: id, players: [] } as unknown as Team;
}

function match(
    session: number,
    a: string,
    scoreA: number,
    b: string,
    scoreB: number,
): TournamentMatch {
    return {
        id: `${session}-${a}-${b}`,
        sessionNumber: session,
        teamA: team(a),
        teamB: team(b),
        scoreA,
        scoreB,
        isBye: false,
        status: MatchStatus.VALIDATED,
    } as unknown as TournamentMatch;
}

function bye(session: number, a: string): TournamentMatch {
    return {
        ...match(session, a, 0, 'none', 0),
        teamB: null,
        isBye: true,
        byeWin: true,
    } as unknown as TournamentMatch;
}

function ranking(...ids: string[][]): GlobalRankingEntry[] {
    // Each inner array shares a rank.
    let rank = 1;
    const entries: GlobalRankingEntry[] = [];
    for (const group of ids) {
        for (const teamId of group) {
            entries.push({ rank, teamId } as GlobalRankingEntry);
        }
        rank += group.length;
    }
    return entries;
}

function candidate(id: string, lostMatch: TournamentMatch): LoserCandidate {
    return { team: team(id), lostMatch };
}

function ids(teams: Team[]): string[] {
    return teams.map((t) => t.id);
}

describe('rankBestLosers', () => {
    it('ranks first by the goal average of the lost match', () => {
        const lostBy2 = match(5, 'W1', 13, 'L1', 11); // L1: -2
        const lostBy10 = match(5, 'L2', 3, 'W2', 13); // L2 is team A: -10
        const lostBy6 = match(5, 'W3', 13, 'L3', 7); // L3: -6
        const ctx: BestLoserContext = {
            // The ranking says the opposite: the lost match GA must win.
            globalRanking: ranking(['L2'], ['L3'], ['L1']),
            pastMatches: [lostBy2, lostBy10, lostBy6],
            random: () => 0.5,
        };

        const ranked = rankBestLosers(
            [candidate('L2', lostBy10), candidate('L1', lostBy2), candidate('L3', lostBy6)],
            ctx,
        );

        expect(ids(ranked)).toEqual(['L1', 'L3', 'L2']);
    });

    it('splits a tie on the lost match by the cumulative ranking', () => {
        const m1 = match(5, 'W1', 13, 'L1', 8);
        const m2 = match(5, 'W2', 13, 'L2', 8);
        const m3 = match(5, 'W3', 13, 'L3', 8);
        const ctx: BestLoserContext = {
            globalRanking: ranking(['L3'], ['L1'], ['L2']),
            pastMatches: [m1, m2, m3],
            random: () => 0.5,
        };

        const ranked = rankBestLosers(
            [candidate('L1', m1), candidate('L2', m2), candidate('L3', m3)],
            ctx,
        );

        expect(ids(ranked)).toEqual(['L3', 'L1', 'L2']);
    });

    it('then walks back through the previous matches, byes skipped', () => {
        const lost1 = match(5, 'W1', 13, 'L1', 8);
        const lost2 = match(5, 'W2', 13, 'L2', 8);
        const ctx: BestLoserContext = {
            // Same rank for both.
            globalRanking: ranking(['L1', 'L2']),
            pastMatches: [
                lost1,
                lost2,
                // Previous match: same GA (+3) for both.
                match(4, 'L1', 13, 'X', 10),
                match(4, 'L2', 13, 'Y', 10),
                // L2 had a bye in round 3: skipped, its match before is compared.
                bye(3, 'L2'),
                match(3, 'L1', 13, 'Z', 12), // L1: +1
                match(2, 'L2', 13, 'T', 5), // L2: +8
            ],
            random: () => 0.5,
        };

        const ranked = rankBestLosers([candidate('L1', lost1), candidate('L2', lost2)], ctx);

        expect(ids(ranked)).toEqual(['L2', 'L1']);
    });

    it('draws lots when everything else is equal', () => {
        const lost1 = match(5, 'W1', 13, 'L1', 8);
        const lost2 = match(5, 'W2', 13, 'L2', 8);
        const lost3 = match(5, 'W3', 13, 'L3', 8);
        const draws = [0.9, 0.1, 0.5];
        let call = 0;
        const ctx: BestLoserContext = {
            globalRanking: ranking(['L1', 'L2', 'L3']),
            pastMatches: [lost1, lost2, lost3],
            random: () => draws[call++],
        };

        const ranked = rankBestLosers(
            [candidate('L1', lost1), candidate('L2', lost2), candidate('L3', lost3)],
            ctx,
        );

        // Lowest draw first.
        expect(ids(ranked)).toEqual(['L2', 'L3', 'L1']);
    });
});
