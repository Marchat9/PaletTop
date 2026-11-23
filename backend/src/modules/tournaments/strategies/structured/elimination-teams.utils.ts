import { Logger } from '@nestjs/common';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { GlobalRankingEntry } from '../../responses/ranking.dto';
import { LoserCandidate, rankBestLosers } from './best-losers.utils';
import { PlanGroup, TournamentPlan } from './plan/plan.types';
import { bracketKey } from './plan/structured-plan';

const logger = new Logger('EliminationTeams');

const CHALLENGE_PREFIX = 'challenge_';

/** Everything needed to tell which teams play a group of an elimination round. */
export interface EliminationContext {
    plan: Omit<TournamentPlan, 'options'>;
    /** Full team entities (the draw needs the players for the club constraints). */
    teams: Team[];
    pastMatches: TournamentMatch[];
    /** Cumulative ranking with the tournament's score calculation. */
    globalRanking: GlobalRankingEntry[];
    /** Last teams of the qualifying ranking that play no elimination match. */
    stoppedCount: number;
    random: () => number;
}

/** Winners (byes included) and losers of a group at one round. */
interface GroupOutcome {
    winners: Team[];
    losers: LoserCandidate[];
}

/**
 * Resolves the teams of each plan group of an elimination round from the earlier results.
 * Results and best-loser rankings are computed once per group and round, so that a bracket and
 * its challenge always agree on who was brought back (the random tie-break is drawn once).
 */
export class EliminationTeamsResolver {
    private readonly teamById: Map<string, Team>;
    private readonly outcomes = new Map<string, GroupOutcome>();
    private readonly rankedLosers = new Map<string, Team[]>();

    constructor(private readonly ctx: EliminationContext) {
        this.teamById = new Map(ctx.teams.map((team) => [team.id, team]));
    }

    /** Teams of `group` at round `roundNumber`. */
    teamsOf(group: PlanGroup, roundNumber: number): Team[] {
        const previous = this.planGroup(group.key, roundNumber - 1);
        if (previous) {
            return this.continuingTeams(previous, roundNumber - 1);
        }
        switch (group.kind) {
            case 'main':
            case 'consolation':
                return this.seededTeams(group.key);
            case 'challenge':
                return this.challengeEntrants(group.key, roundNumber - 1);
            case 'third_place':
                // The final's round: the previous main round is the semi-finals.
                return this.outcome(bracketKey(0), roundNumber - 1).losers.map((l) => l.team);
            default:
                return [];
        }
    }

    private planGroup(key: string, roundNumber: number): PlanGroup | undefined {
        return this.ctx.plan.rounds
            .find((round) => round.number === roundNumber)
            ?.groups.find((group) => group.key === key);
    }

    /** A group's own winners of its previous round, plus the best losers the plan brings back. */
    private continuingTeams(previous: PlanGroup, roundNumber: number): Team[] {
        const { winners } = this.outcome(previous.key, roundNumber);
        if (previous.bestLosersIn === 0) {
            return winners;
        }
        const repeched = this.bestLosers(previous.key, roundNumber).slice(0, previous.bestLosersIn);
        logger.debug(
            `${previous.key}: ${winners.length} winners + ${repeched.length} best losers of round ${roundNumber}`,
        );
        return [...winners, ...repeched];
    }

    /**
     * First round of a main or consolation bracket: its slice of the qualifying ranking, the
     * stopped teams left out. Brackets take the ranks in the plan's order (main = best ranks).
     */
    private seededTeams(key: string): Team[] {
        const { plan, globalRanking, stoppedCount } = this.ctx;
        const ranked = [...globalRanking].sort((a, b) => a.rank - b.rank);
        const playing = ranked.slice(0, Math.max(ranked.length - stoppedCount, 0));
        const index = plan.brackets.findIndex((bracket) => bracket.key === key);
        const offset = plan.brackets
            .slice(0, index)
            .reduce((total, bracket) => total + bracket.teamCount, 0);
        const bracket = plan.brackets[index];
        return playing
            .slice(offset, offset + (bracket?.teamCount ?? 0))
            .map((entry) => this.teamById.get(entry.teamId))
            .filter((team): team is Team => !!team);
    }

    /** First round of a challenge: its parent's first-round losers, minus those brought back. */
    private challengeEntrants(key: string, parentRound: number): Team[] {
        const parentKey = key.slice(CHALLENGE_PREFIX.length);
        const repechedCount = this.planGroup(parentKey, parentRound)?.bestLosersIn ?? 0;
        return this.bestLosers(parentKey, parentRound).slice(repechedCount);
    }

    private outcome(key: string, roundNumber: number): GroupOutcome {
        const id = `${key}#${roundNumber}`;
        let outcome = this.outcomes.get(id);
        if (!outcome) {
            outcome = this.computeOutcome(key, roundNumber);
            this.outcomes.set(id, outcome);
        }
        return outcome;
    }

    private computeOutcome(key: string, roundNumber: number): GroupOutcome {
        const outcome: GroupOutcome = { winners: [], losers: [] };
        const matches = this.ctx.pastMatches.filter(
            (m) => m.pool?.name === key && m.sessionNumber === roundNumber,
        );
        for (const match of matches) {
            const teamA = this.teamById.get(match.teamA.id);
            if (match.isBye || !match.teamB) {
                if (teamA) outcome.winners.push(teamA);
                continue;
            }
            const teamB = this.teamById.get(match.teamB.id);
            // Elimination matches cannot end in a draw: an equal score never gets validated.
            const [winner, loser] = match.scoreA > match.scoreB ? [teamA, teamB] : [teamB, teamA];
            if (winner) outcome.winners.push(winner);
            if (loser) outcome.losers.push({ team: loser, lostMatch: match });
        }
        return outcome;
    }

    /** Losers of a group at one round, best first. */
    private bestLosers(key: string, roundNumber: number): Team[] {
        const id = `${key}#${roundNumber}`;
        let ranked = this.rankedLosers.get(id);
        if (!ranked) {
            ranked = rankBestLosers(this.outcome(key, roundNumber).losers, {
                globalRanking: this.ctx.globalRanking,
                pastMatches: this.ctx.pastMatches,
                random: this.ctx.random,
            });
            this.rankedLosers.set(id, ranked);
        }
        return ranked;
    }
}
