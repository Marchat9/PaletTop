import { describe, expect, it } from 'vitest';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { StructuredCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchesSessionStatus, MatchStatus, TournamentStatus } from 'src/enum/status.enum';
import { CompetitionMode, EliminationSeeding, ScoreCalculation } from 'src/enum/tounament.enum';
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
    eliminationSeeding?: EliminationSeeding;
    /** Rematches allowed. */
    rematch?: boolean;
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
            scoreCalculation: ScoreCalculation.VICTORY_GOAL_AVERAGE,
            rematch: input.rematch ?? false,
            competitionConfiguration: {
                numberOfQualifyingRounds: input.numberOfQualifyingRounds,
                consolationCount: input.consolationCount,
                hasChallenges: input.hasChallenges,
                hasThirdPlaceMatch: input.hasThirdPlaceMatch,
                eliminationSeeding: input.eliminationSeeding,
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
            { byeLoserCap: 6 },
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

    describe('Placement of the first elimination round', () => {
        it('pyramidal: the best seeds meet the worst ones, the plates follow the positions', async () => {
            const result = await simulate({
                teamCount: 8,
                targetCount: 8,
                consolationCount: 0,
                numberOfQualifyingRounds: 2,
                hasChallenges: false,
                hasThirdPlaceMatch: false,
                choice: { consolationCount: 0, eliminatedAfterQualifying: 0 },
                eliminationSeeding: EliminationSeeding.PYRAMIDAL,
                rematch: true,
            });

            const qualifyingRanking = result.strategy.computeGlobalRanking(
                result.tournament,
                result.allMatches.filter(
                    (m) => (m.sessionNumber ?? 0) <= result.config.numberOfQualifyingRounds,
                ),
            );
            const seedOf = new Map(
                qualifyingRanking.map((entry, index) => [entry.teamId, index + 1]),
            );
            const quarterFinals = [...eliminationRounds(result)[0].matches].sort(
                (a, b) => a.bracketPosition! - b.bracketPosition!,
            );

            // The standard order for 8: 1v8, 4v5, 2v7, 3v6, by position, plates 1 to 4.
            expect(
                quarterFinals.map((m) =>
                    [seedOf.get(m.teamA.id)!, seedOf.get(m.teamB!.id)!].sort((a, b) => a - b),
                ),
            ).toEqual([
                [1, 8],
                [4, 5],
                [2, 7],
                [3, 6],
            ]);
            expect(quarterFinals.map((m) => m.plateNumber)).toEqual([1, 2, 3, 4]);
            expect(quarterFinals.map((m) => m.bracketPosition)).toEqual([0, 1, 2, 3]);
            expectRoundsToFollowThePlan(result);
            expectNoTeamTwiceInARound(result);
            expectFinished(result);
        });

        it('pyramidal: 12 teams, the 4 byes go to the 4 best seeds and stay 0-0 wins', async () => {
            const result = await simulate({
                teamCount: 12,
                targetCount: 12,
                consolationCount: 0,
                numberOfQualifyingRounds: 2,
                hasChallenges: true,
                hasThirdPlaceMatch: true,
                choice: { consolationCount: 0, eliminatedAfterQualifying: 0 },
                eliminationSeeding: EliminationSeeding.PYRAMIDAL,
            });

            const qualifyingRanking = result.strategy.computeGlobalRanking(
                result.tournament,
                result.allMatches.filter(
                    (m) => (m.sessionNumber ?? 0) <= result.config.numberOfQualifyingRounds,
                ),
            );
            const seedOf = new Map(
                qualifyingRanking.map((entry, index) => [entry.teamId, index + 1]),
            );
            const first = eliminationRounds(result)[0].matches;
            const byes = first.filter((m) => m.isBye);

            expect(byes.map((m) => seedOf.get(m.teamA.id)).sort((a, b) => a! - b!)).toEqual([
                1, 2, 3, 4,
            ]);
            expect(byes.every((m) => m.scoreA === 0 && m.scoreB === 0 && m.byeWin)).toBe(true);
            expect(first.filter((m) => !m.isBye)).toHaveLength(4);
            expect(first.every((m) => m.plateNumber === null || m.plateNumber <= 4)).toBe(true);
            expectRoundsToFollowThePlan(result);
            expectNoTeamTwiceInARound(result);
            expectFinished(result);
        });

        it('pyramidal: an odd bracket with a consolation and challenges still follows the plan', async () => {
            const result = await simulate({
                teamCount: 11,
                targetCount: 11,
                consolationCount: 1,
                numberOfQualifyingRounds: 2,
                hasChallenges: true,
                hasThirdPlaceMatch: true,
                choice: { consolationCount: 1, eliminatedAfterQualifying: 0 },
                eliminationSeeding: EliminationSeeding.PYRAMIDAL,
            });

            expectRoundsToFollowThePlan(result);
            expectNoTeamTwiceInARound(result);
            expectFinished(result);
        });

        it('random: plays the whole tournament as planned, the same tree twice', async () => {
            const input: SimulationInput = {
                teamCount: 12,
                targetCount: 12,
                consolationCount: 0,
                numberOfQualifyingRounds: 2,
                hasChallenges: true,
                hasThirdPlaceMatch: true,
                choice: { consolationCount: 0, eliminatedAfterQualifying: 0 },
                eliminationSeeding: EliminationSeeding.RANDOM,
            };
            const result = await simulate(input);
            const again = await simulate(input);

            expectRoundsToFollowThePlan(result);
            expectNoTeamTwiceInARound(result);
            expectFinished(result);
            const tree = (r: SimulationResult) =>
                eliminationRounds(r)[0].matches.map(
                    (m) => `${m.bracketPosition}:${m.teamA.id}-${m.teamB?.id ?? 'bye'}`,
                );
            expect(tree(result)).toEqual(tree(again));
        });

        it('reads a missing seeding as pyramidal', async () => {
            const result = await simulate({
                teamCount: 8,
                targetCount: 8,
                consolationCount: 0,
                numberOfQualifyingRounds: 2,
                hasChallenges: false,
                hasThirdPlaceMatch: false,
                choice: { consolationCount: 0, eliminatedAfterQualifying: 0 },
            });

            const quarterFinals = eliminationRounds(result)[0].matches;
            expect(quarterFinals.map((m) => m.bracketPosition)).toEqual([0, 1, 2, 3]);
            expectRoundsToFollowThePlan(result);
            expectFinished(result);
        });
    });

    describe('Standings of a pyramidal bracket with byes', () => {
        async function playTwelve() {
            return simulate({
                teamCount: 12,
                targetCount: 12,
                consolationCount: 0,
                numberOfQualifyingRounds: 2,
                hasChallenges: true,
                hasThirdPlaceMatch: true,
                choice: { consolationCount: 0, eliminatedAfterQualifying: 0 },
                eliminationSeeding: EliminationSeeding.PYRAMIDAL,
            });
        }

        it('ranks the 12 teams 1 to 12 once, the winner of the final first', async () => {
            const result = await playTwelve();
            const standings = result.strategy.computeStandings(
                result.tournament,
                result.allMatches,
            );

            expect(standings.map((entry) => entry.rank)).toEqual(
                Array.from({ length: 12 }, (_, i) => i + 1),
            );
            const finalRound = result.rounds[result.rounds.length - 1];
            const final = finalRound.matches.find((m) => m.pool!.name === 'principale')!;
            const winner = final.scoreA > final.scoreB ? final.teamA : final.teamB!;
            const loser = final.scoreA > final.scoreB ? final.teamB! : final.teamA;
            expect(standings[0].teamId).toBe(winner.id);
            expect(standings[1].teamId).toBe(loser.id);
        });

        it('keeps the teams with a first-round bye in the principal table, never in the challenge', async () => {
            const result = await playTwelve();
            const standings = result.strategy.computeStandings(
                result.tournament,
                result.allMatches,
            );
            const sectionOf = new Map(standings.map((entry) => [entry.teamId, entry.section]));
            const firstRound = eliminationRounds(result)[0].matches;

            const byeTeams = firstRound.filter((m) => m.isBye).map((m) => m.teamA.id);
            expect(byeTeams).toHaveLength(4);
            for (const teamId of byeTeams) {
                expect(sectionOf.get(teamId)).toBe('principale');
            }
        });

        it('sends the 4 teams that lost a first-round match to the challenge', async () => {
            const result = await playTwelve();
            const standings = result.strategy.computeStandings(
                result.tournament,
                result.allMatches,
            );
            const sectionOf = new Map(standings.map((entry) => [entry.teamId, entry.section]));
            const firstRound = eliminationRounds(result)[0].matches;

            const losers = firstRound
                .filter((m) => !m.isBye)
                .map((m) => (m.scoreA > m.scoreB ? m.teamB!.id : m.teamA.id));
            expect(losers).toHaveLength(4);
            for (const teamId of losers) {
                expect(sectionOf.get(teamId)).toBe('challenge_principale');
            }
        });
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
