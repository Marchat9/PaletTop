import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { EliminationSeeding } from 'src/enum/tounament.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import { GlobalRankingEntry } from '../../responses/ranking.dto';
import { generatePairsWithContraints } from '../../utils/draw.utils';
import { sortRankingEntries } from '../../utils/match.utils';
import { buildSeed, seededRandom } from '../../utils/seeded-random.utils';
import {
    BracketResult,
    BracketSlot,
    buildPyramidalFirstRound,
    buildRandomFirstRound,
    nextRoundSlots,
} from './bracket/bracket.utils';
import { PlanGroup, TournamentPlan } from './plan/plan.types';
import { bracketKey } from './plan/structured-plan';

const CHALLENGE_PREFIX = 'challenge_';

/** Everything needed to tell who plays a group of an elimination round, and where in its tree. */
export interface EliminationContext {
    plan: Omit<TournamentPlan, 'options'>;
    /** Full team entities (the draw needs the players for the club constraints). */
    teams: Team[];
    pastMatches: TournamentMatch[];
    /** Ranking of the qualifying rounds only: it seeds the brackets and the challenges. */
    qualifyingRanking: GlobalRankingEntry[];
    /** Last teams of the qualifying ranking that play no elimination match. */
    stoppedCount: number;
    seeding: EliminationSeeding;
    tournamentId: string;
    /** Constraints of the tournament, for the random seeding of a first round. */
    constraintConfig: ConstraintConfig;
}

/**
 * Resolves the matches of each plan group of an elimination round, as slots of a fixed bracket
 * tree: the first round of a bracket is placed from the qualifying ranking (pyramidal seeding, byes
 * for the best seeds) or drawn with the seed; every later round takes the winners of the previous
 * round by position (match `k` holds the winners of positions `2k` and `2k + 1`), with no new draw.
 */
export class EliminationTeamsResolver {
    private readonly teamById: Map<string, Team>;
    /** Position of each team in the qualifying ranking, best first. */
    private readonly qualifyingPosition: Map<string, number>;

    constructor(private readonly ctx: EliminationContext) {
        this.teamById = new Map(ctx.teams.map((team) => [team.id, team]));
        this.qualifyingPosition = new Map(
            sortRankingEntries(ctx.qualifyingRanking).map((entry, index) => [entry.teamId, index]),
        );
    }

    /** The slots of `group` at round `roundNumber`, by position. */
    slotsOf(group: PlanGroup, roundNumber: number): BracketSlot[] {
        if (this.planGroup(group.key, roundNumber - 1)) {
            return this.continuingSlots(group.key, roundNumber - 1);
        }
        switch (group.kind) {
            case 'main':
            case 'consolation':
                return this.firstRound(group.key, roundNumber, this.seededTeams(group.key));
            case 'challenge':
                return this.firstRound(
                    group.key,
                    roundNumber,
                    this.challengeEntrants(group.key, roundNumber - 1),
                );
            case 'third_place':
                // The final's round: the previous main round is the semi-finals.
                return this.thirdPlaceSlots(roundNumber - 1);
            default:
                return [];
        }
    }

    private planGroup(key: string, roundNumber: number): PlanGroup | undefined {
        return this.ctx.plan.rounds
            .find((round) => round.number === roundNumber)
            ?.groups.find((group) => group.key === key);
    }

    private team(id: string): Team {
        const team = this.teamById.get(id);
        if (!team) {
            throw new Error(`Team ${id} is not part of the tournament.`);
        }
        return team;
    }

    /** First round of a bracket: its teams (best seed first) placed in the tree. */
    private firstRound(key: string, roundNumber: number, seededTeams: Team[]): BracketSlot[] {
        if (seededTeams.length < 2) {
            return [];
        }
        if (this.ctx.seeding === EliminationSeeding.PYRAMIDAL) {
            return buildPyramidalFirstRound(seededTeams);
        }
        const { tournamentId, constraintConfig, pastMatches } = this.ctx;
        return buildRandomFirstRound(
            seededTeams,
            seededRandom(buildSeed(tournamentId, 'bracket', roundNumber, key)),
            (playing) =>
                generatePairsWithContraints(
                    constraintConfig,
                    playing,
                    pastMatches,
                    seededRandom(buildSeed(tournamentId, 'draw', roundNumber, key)),
                ),
        );
    }

    /**
     * First round of a main or consolation bracket: its slice of the qualifying ranking, the
     * stopped teams left out. Brackets take the ranks in the plan's order (main = best ranks).
     */
    private seededTeams(key: string): Team[] {
        const { plan, qualifyingRanking, stoppedCount } = this.ctx;
        const ranked = sortRankingEntries(qualifyingRanking);
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

    /** The matches of a group at one round, played in the bracket (every one has a position). */
    private matchesOf(key: string, roundNumber: number): TournamentMatch[] {
        return this.ctx.pastMatches.filter(
            (match) => match.pool?.name === key && match.sessionNumber === roundNumber,
        );
    }

    /** Winner of a match: the bye team, or the team with the higher score (never a draw). */
    private winnerOf(match: TournamentMatch): Team {
        if (match.isBye || !match.teamB) {
            return this.team(match.teamA.id);
        }
        return this.team(match.scoreA > match.scoreB ? match.teamA.id : match.teamB.id);
    }

    /** Loser of a played match; the caller never asks for a bye. */
    private loserOf(match: TournamentMatch): Team {
        return this.team(match.scoreA > match.scoreB ? match.teamB!.id : match.teamA.id);
    }

    /** A group's next round: the winners of its previous round, two by two. */
    private continuingSlots(key: string, previousRound: number): BracketSlot[] {
        const results: BracketResult[] = this.matchesOf(key, previousRound).map((match) => {
            if (match.bracketPosition === null || match.bracketPosition === undefined) {
                throw new Error(
                    `A match of ${key} at round ${previousRound} has no bracket position.`,
                );
            }
            return { position: match.bracketPosition, winner: this.winnerOf(match) };
        });
        return nextRoundSlots(results);
    }

    /** First round of a challenge: the losers of its parent's first round, best qualifier first. */
    private challengeEntrants(key: string, parentRound: number): Team[] {
        const parentKey = key.slice(CHALLENGE_PREFIX.length);
        const position = (team: Team): number =>
            this.qualifyingPosition.get(team.id) ?? Number.MAX_SAFE_INTEGER;
        return this.matchesOf(parentKey, parentRound)
            .filter((match) => !match.isBye && match.teamB)
            .map((match) => this.loserOf(match))
            .sort((a, b) => position(a) - position(b) || a.id.localeCompare(b.id));
    }

    /** The 3rd-place match: the two losers of the main semi-finals, one match at position 0. */
    private thirdPlaceSlots(semiFinalRound: number): BracketSlot[] {
        const losers = this.matchesOf(bracketKey(0), semiFinalRound)
            .filter((match) => !match.isBye && match.teamB)
            .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0))
            .map((match) => this.loserOf(match));
        return losers.length === 2 ? [{ position: 0, teamA: losers[0], teamB: losers[1] }] : [];
    }
}
