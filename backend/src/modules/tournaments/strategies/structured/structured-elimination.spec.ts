import { describe, expect, it } from 'vitest';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { StructuredCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchesSessionStatus, MatchStatus, TournamentStatus } from 'src/enum/status.enum';
import { CompetitionMode, ScoreCalculation } from 'src/enum/tounament.enum';
import { TournamentStatusInfo } from '../../responses/tournament-status.dto';
import { PlanSettings, StartChoice } from '../tournament-strategy.abstract';
import { PlanRound } from './plan/plan.types';
import { StructuredTournamentStrategy } from './structured-tournament.strategy';

const settings: PlanSettings = {
    maxConsolations: 4,
    thresholds: { okRatio: 0.9, warningRatio: 0.75 },
};

interface SimulationInput {
    teamCount: number;
    targetCount: number;
    consolationCount: number;
    numberOfQualifyingRounds: number;
    hasChallenges: boolean;
    hasThirdPlaceMatch: boolean;
    choice: StartChoice;
}

/** What the generation produced for one group of one round. */
interface GeneratedGroup {
    key: string;
    teamCount: number;
    matchCount: number;
    byeCount: number;
    plateStart: number;
    plateEnd: number;
}

interface GeneratedRound {
    sessionNumber: number;
    matches: TournamentMatch[];
    groups: GeneratedGroup[];
    status: TournamentStatusInfo;
}

interface SimulationResult {
    config: StructuredCompetitionConfiguration;
    tournament: Tournament;
    rounds: GeneratedRound[];
    allMatches: TournamentMatch[];
    strategy: StructuredTournamentStrategy;
}

function teamIndex(team: { id: string }): number {
    return Number(team.id.replace('team-', ''));
}

/** Deterministic result: the lower index wins 13 to a score depending on both teams and the round. */
function play(match: TournamentMatch): TournamentMatch {
    if (match.isBye || !match.teamB) return match;
    const a = teamIndex(match.teamA);
    const b = teamIndex(match.teamB);
    const loserScore = (a * 7 + b * 3 + (match.sessionNumber ?? 0)) % 13;
    const aWins = a < b;
    return {
        ...match,
        scoreA: aWins ? 13 : loserScore,
        scoreB: aWins ? loserScore : 13,
        status: MatchStatus.VALIDATED,
    } as TournamentMatch;
}

function generatedGroups(matches: TournamentMatch[]): GeneratedGroup[] {
    const groups: GeneratedGroup[] = [];
    for (const match of matches) {
        const key = match.pool!.name!;
        let group = groups.find((g) => g.key === key);
        if (!group) {
            group = {
                key,
                teamCount: 0,
                matchCount: 0,
                byeCount: 0,
                plateStart: Number.MAX_SAFE_INTEGER,
                plateEnd: 0,
            };
            groups.push(group);
        }
        if (match.isBye) {
            group.byeCount++;
            group.teamCount++;
            continue;
        }
        group.matchCount++;
        group.teamCount += 2;
        group.plateStart = Math.min(group.plateStart, match.plateNumber!);
        group.plateEnd = Math.max(group.plateEnd, match.plateNumber!);
    }
    return groups;
}

function planGroups(round: PlanRound): GeneratedGroup[] {
    return round.groups.map((g) => ({
        key: g.key,
        teamCount: g.teamCount,
        matchCount: g.matchCount,
        byeCount: g.byeCount,
        plateStart: g.plateStart,
        plateEnd: g.plateEnd,
    }));
}

function buildStrategy(): StructuredTournamentStrategy {
    const virtualPools = new Map<string, TournamentPool>();
    let ids = 0;
    const poolService = {
        assignTeamsToPools: async (tournament: Tournament) => [
            { id: 'pool-1', poolNumber: 1, name: null, teams: tournament.teams },
        ],
    };
    const matchRepo = {
        create: (match: TournamentMatch) => ({ ...match, id: `match-${++ids}` }),
        save: async (matches: TournamentMatch[]) => matches,
    };
    const poolRepo = {
        findVirtualPoolByName: async (_tournamentId: string, name: string) =>
            virtualPools.get(name) ?? null,
        create: (pool: TournamentPool) => pool,
        save: async (pool: TournamentPool) => {
            const saved = { ...pool, id: `vpool-${pool.name}` };
            virtualPools.set(pool.name!, saved);
            return saved;
        },
    };
    const tournamentRepo = { save: async (t: Tournament) => t };
    return new StructuredTournamentStrategy(
        poolService as never,
        matchRepo as never,
        poolRepo as never,
        tournamentRepo as never,
    );
}

/** Plays a whole tournament, every session validated, until it can be finished. */
async function simulate(input: SimulationInput): Promise<SimulationResult> {
    const strategy = buildStrategy();
    const teams = Array.from(
        { length: input.teamCount },
        (_, i) => ({ id: `team-${i}`, name: `Team ${i}`, code: `C${i}`, players: [] }) as unknown,
    ) as Team[];
    const draft = {
        id: 'TR',
        code: 'SIMU',
        status: TournamentStatus.ACTIVE,
        teams,
        matches: [],
        matchsSessions: [],
        configuration: {
            maxTeamCapacity: input.targetCount,
            competitionMode: CompetitionMode.STANDARD,
            scoreCalculation: ScoreCalculation.VICTORY_AND_GOAL_AVERAGE,
            competitionConfiguration: {
                numberOfQualifyingRounds: input.numberOfQualifyingRounds,
                consolationCount: input.consolationCount,
                hasChallenges: input.hasChallenges,
                hasThirdPlaceMatch: input.hasThirdPlaceMatch,
            },
        },
    } as unknown as Tournament;

    const prepared = await strategy.prepareTournamentStart(draft, {
        settings,
        choice: input.choice,
    });
    const pools = await strategy.assignTeamsToFirstPools(prepared);
    const config = prepared.configuration
        .competitionConfiguration as StructuredCompetitionConfiguration;

    const allMatches: TournamentMatch[] = [];
    const sessions: MatchesSession[] = [];
    const rounds: GeneratedRound[] = [];
    let tournament: Tournament = { ...prepared, pools };

    for (let sessionNumber = 1; sessionNumber <= 30; sessionNumber++) {
        const session = {
            id: `session-${sessionNumber}`,
            sessionNumber,
            status: MatchesSessionStatus.OPEN,
            matches: [],
        } as unknown as MatchesSession;
        sessions.forEach((s) => (s.status = MatchesSessionStatus.CLOSED));
        sessions.push(session);

        const generated = await strategy.generateSessionMatches(
            { ...tournament, matches: [...allMatches] },
            session,
        );
        const played = generated.map(play);
        session.matches = played;
        allMatches.push(...played);
        tournament = { ...tournament, matches: [...allMatches], matchsSessions: sessions };

        const status = strategy.computeTournamentStatus(tournament, sessions);
        rounds.push({ sessionNumber, matches: played, groups: generatedGroups(played), status });
        if (!status.canGenerateNewSession) break;
    }
    return { config, tournament, rounds, allMatches, strategy };
}

function eliminationRounds(result: SimulationResult): GeneratedRound[] {
    return result.rounds.filter((r) => r.sessionNumber > result.config.numberOfQualifyingRounds);
}

function expectRoundsToFollowThePlan(result: SimulationResult): void {
    const plan = result.config.plan!;
    expect(result.rounds.length).toBe(plan.totalRounds);
    for (const round of eliminationRounds(result)) {
        const planRound = plan.rounds.find((r) => r.number === round.sessionNumber)!;
        expect({ session: round.sessionNumber, groups: round.groups }).toEqual({
            session: round.sessionNumber,
            groups: planGroups(planRound),
        });
    }
}

function expectFinished(result: SimulationResult): void {
    const last = result.rounds[result.rounds.length - 1];
    expect(last.status.canFinishTournament).toBe(true);
    expect(last.status.canGenerateNewSession).toBe(false);
    expect(result.strategy.canCompleteTournament(result.tournament)).toBe(true);
    // Every earlier round could not finish the tournament yet.
    for (const round of result.rounds.slice(0, -1)) {
        expect(round.status.canFinishTournament).toBe(false);
        expect(round.status.canGenerateNewSession).toBe(true);
    }
}

/** Every team plays at most one match per session. */
function expectNoTeamTwiceInARound(result: SimulationResult): void {
    for (const round of result.rounds) {
        const ids = round.matches.flatMap((m) => [m.teamA.id, ...(m.teamB ? [m.teamB.id] : [])]);
        expect(new Set(ids).size).toBe(ids.length);
    }
}

describe('Structured elimination generated from the frozen plan', () => {
    it('plays 120 teams (target 120, 2 consolations, challenges, 3rd place) as planned', async () => {
        const result = await simulate({
            teamCount: 120,
            targetCount: 120,
            consolationCount: 2,
            numberOfQualifyingRounds: 4,
            hasChallenges: true,
            hasThirdPlaceMatch: true,
            choice: { consolationCount: 2, eliminatedAfterQualifying: 0 },
        });

        expect(result.config.plan!.brackets.map((b) => [b.capacity, b.teamCount])).toEqual([
            [64, 64],
            [32, 32],
            [32, 24],
        ]);
        expectRoundsToFollowThePlan(result);
        expectNoTeamTwiceInARound(result);
        expectFinished(result);

        const last = result.rounds[result.rounds.length - 1];
        const final = last.matches.find((m) => m.pool!.name === 'principale')!;
        const thirdPlace = last.matches.find((m) => m.pool!.name === 'third_place_match')!;
        expect(final.plateNumber).toBe(1);
        expect(thirdPlace.plateNumber).toBe(2);
        expect(last.status.phaseName).toBe('Finale + Petite Finale');
    });

    it('plays 100 teams (2 consolations, challenges, 3rd place) as planned', async () => {
        const result = await simulate({
            teamCount: 100,
            targetCount: 100,
            consolationCount: 2,
            numberOfQualifyingRounds: 4,
            hasChallenges: true,
            hasThirdPlaceMatch: true,
            choice: { consolationCount: 2, eliminatedAfterQualifying: 0 },
        });

        expect(result.config.plan!.brackets.map((b) => [b.capacity, b.teamCount])).toEqual([
            [64, 64],
            [32, 32],
            [4, 4],
        ]);
        expectRoundsToFollowThePlan(result);
        expectNoTeamTwiceInARound(result);
        expectFinished(result);
    });

    it('keeps the main-only behaviour without consolation: 8 teams, final on plate 1', async () => {
        const result = await simulate({
            teamCount: 8,
            targetCount: 8,
            consolationCount: 0,
            numberOfQualifyingRounds: 2,
            hasChallenges: false,
            hasThirdPlaceMatch: false,
            choice: { consolationCount: 0, eliminatedAfterQualifying: 0 },
        });

        const elimination = eliminationRounds(result);
        expect(elimination.map((r) => r.groups.map((g) => [g.key, g.matchCount]))).toEqual([
            [['principale', 4]],
            [['principale', 2]],
            [['principale', 1]],
        ]);
        expect(elimination.map((r) => r.status.phaseName)).toEqual([
            'Quarts de finale',
            'Demi-finales',
            'Finale',
        ]);
        expect(result.rounds.slice(0, 2).map((r) => r.status.phaseName)).toEqual([
            'Phase qualificative 1/2',
            'Phase qualificative 2/2',
        ]);
        expect(elimination[2].matches[0].plateNumber).toBe(1);
        expectRoundsToFollowThePlan(result);
        expectFinished(result);
    });

    it('never puts the 6 teams stopped after the qualifiers in an elimination match', async () => {
        const result = await simulate({
            teamCount: 70,
            targetCount: 64,
            consolationCount: 0,
            numberOfQualifyingRounds: 3,
            hasChallenges: true,
            hasThirdPlaceMatch: true,
            choice: { consolationCount: 0, eliminatedAfterQualifying: 6 },
        });
        expect(result.config.eliminatedAfterQualifying).toBe(6);
        expect(result.config.plan!.teamCount).toBe(64);

        const qualifyingMatches = result.allMatches.filter(
            (m) => (m.sessionNumber ?? 0) <= result.config.numberOfQualifyingRounds,
        );
        const qualifyingRanking = result.strategy.computeGlobalRanking(
            result.tournament,
            qualifyingMatches,
        );
        const stopped = qualifyingRanking.slice(-6).map((e) => e.teamId);
        const eliminationTeams = new Set(
            eliminationRounds(result)
                .flatMap((r) => r.matches)
                .flatMap((m) => [m.teamA.id, ...(m.teamB ? [m.teamB.id] : [])]),
        );
        expect(stopped.filter((id) => eliminationTeams.has(id))).toEqual([]);
        expect(eliminationTeams.size).toBe(64);

        expectRoundsToFollowThePlan(result);
        expectFinished(result);

        // They end after every bracket team in the standings.
        const standings = result.strategy.computeStandings(result.tournament, result.allMatches);
        const byRank = [...standings].sort((a, b) => a.rank - b.rank).map((e) => e.teamId);
        expect(new Set(byRank.slice(-6))).toEqual(new Set(stopped));
    });
});
