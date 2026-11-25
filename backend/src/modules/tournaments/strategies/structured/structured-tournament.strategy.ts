import { BadRequestException, Logger } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { StructuredCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchStatus, TournamentStatus } from 'src/enum/status.enum';
import { MatchGroupKey } from 'src/enum/tounament.enum';
import { TournamentRepository } from 'src/modules/tournaments/repositories/tournament.repository';
import { extractCompetitionConfiguration } from 'src/modules/tournaments/utils/tournament.utils';
import { DeepPartial } from 'typeorm';
import { MatchRepository } from '../../../tournaments/repositories/match.repository';
import { PoolRepository } from '../../../tournaments/repositories/pool.repository';
import { GlobalRankingEntry, RankingSection } from '../../../tournaments/responses/ranking.dto';
import { TournamentStatusInfo } from '../../../tournaments/responses/tournament-status.dto';
import { PoolService } from '../../../tournaments/services/pool.service';
import {
    computePhaseName,
    generateEliminationMatches,
    generateQualifyingMatches,
    toLegacyEliminationTables,
} from './structured-session.utils';
import { PlanSettings, StartOptions, TournamentStrategy } from '../tournament-strategy.abstract';
import { StructuredPlanInput, TournamentPlan } from './plan/plan.types';
import { computeStructuredPlan } from './plan/structured-plan';

interface EliminationExit {
    table: MatchGroupKey;
    session: number;
    won: boolean;
    ownScore: number;
}

// Block order of the tables in the final standings: principal final (1-2), third place (3-4),
// challenge (5-…), consolante, challenge-consolante, then teams knocked out in the pools.
const TABLE_STANDING_ORDER: Record<MatchGroupKey, number> = {
    [MatchGroupKey.PRINCIPALE]: 0,
    [MatchGroupKey.THIRD_PLACE_MATCH]: 1,
    [MatchGroupKey.CHALLENGE]: 2,
    [MatchGroupKey.CONSOLANTE]: 3,
    [MatchGroupKey.CHALLENGE_CONSOLANTE]: 4,
};
const POOL_ONLY_ORDER = 5;

const SINGLE_POOL = 1;

/** The plan as stored: the launch options only make sense before the start. */
function withoutOptions(plan: Omit<TournamentPlan, 'options'>): Omit<TournamentPlan, 'options'> {
    const { options: _options, ...frozen } = plan as TournamentPlan;
    return frozen;
}

/**
 * The 3rd-place match belongs to the principal bracket, right under the final: its players are
 * the semi-final losers, ahead of every earlier exit of the bracket. Ranked as a table of its own
 * (after the whole principal bracket), it put the quarter-final losers 3rd to 6th when there is no
 * consolation table to send them to.
 */
function standingTable(exit: EliminationExit): number {
    return exit.table === MatchGroupKey.THIRD_PLACE_MATCH
        ? TABLE_STANDING_ORDER[MatchGroupKey.PRINCIPALE]
        : TABLE_STANDING_ORDER[exit.table];
}

/** Section of the standings: the 3rd-place match is shown with the principal table. */
function standingSection(exit: EliminationExit | undefined): RankingSection {
    if (!exit) return 'pools';
    return exit.table === MatchGroupKey.THIRD_PLACE_MATCH ? MatchGroupKey.PRINCIPALE : exit.table;
}

/** Just under the final (played in the same round): finalists first, then the 3rd-place match. */
function standingDepth(exit: EliminationExit): number {
    return exit.table === MatchGroupKey.THIRD_PLACE_MATCH ? exit.session - 0.5 : exit.session;
}

export class StructuredTournamentStrategy extends TournamentStrategy {
    private readonly logger = new Logger(StructuredTournamentStrategy.name);

    constructor(
        private readonly poolService: PoolService,
        private readonly matchRepo: MatchRepository,
        private readonly poolRepo: PoolRepository,
        private readonly tournamentRepo: TournamentRepository,
    ) {
        super();
    }

    /** `maxTeamCapacity` is only the target: teams can register above it. */
    override isTeamCapacityHard(): boolean {
        return false;
    }

    /**
     * Once started, the plan frozen at launch is the reference: it is returned as is, never
     * recomputed (it may have been computed for another target, e.g. with an extra consolation).
     * In draft, the plan is computed for `teamCount` with the target `maxTeamCapacity`; a
     * configuration that no longer fits is reported by the plan's warnings. A started tournament
     * without a frozen plan has none.
     */
    override computePlan(
        tournament: Tournament,
        teamCount: number,
        settings: PlanSettings,
    ): TournamentPlan | null {
        const config = this.getConfig(tournament);
        if (config.plan) {
            return { ...config.plan, options: [] };
        }
        if (tournament.status !== TournamentStatus.DRAFT) {
            return null;
        }
        return computeStructuredPlan(this.planInput(tournament, config, teamCount, settings));
    }

    /**
     * Freezes the admin's launch choice in the stored configuration: `consolationCount`,
     * `eliminatedAfterQualifying` and the plan the elimination phase will follow, computed for the
     * registered teams. Without a choice, the stored consolation count is kept and no team stops
     * after the qualifiers. An impossible plan refuses the start (the caller's transaction then
     * leaves the tournament in draft).
     */
    override async prepareTournamentStart(
        tournament: Tournament,
        options?: StartOptions,
    ): Promise<Tournament> {
        this.logger.debug(
            'Starting prepareTournamentStart with tournament code: ' + tournament.code,
        );
        if (!options) {
            throw new Error('The plan settings are required to start a structured tournament.');
        }
        const { settings, choice } = options;
        const config = this.getConfig(tournament);
        const consolationCount = choice.consolationCount ?? config.consolationCount;
        const eliminatedAfterQualifying = choice.eliminatedAfterQualifying ?? 0;

        if (consolationCount > settings.maxConsolations) {
            this.logger.warn(
                `Start of ${tournament.code} refused: ${consolationCount} consolations (max ${settings.maxConsolations})`,
            );
            throw new BadRequestException(`Au maximum ${settings.maxConsolations} consolantes.`);
        }

        const plan = this.planToFreeze(
            tournament,
            config,
            consolationCount,
            eliminatedAfterQualifying,
            settings,
        );
        if (plan.brackets.length === 0) {
            const impossible = plan.warnings.find((w) => w.code === 'IMPOSSIBLE');
            this.logger.warn(
                `Start of ${tournament.code} refused: impossible plan for ${tournament.teams.length} teams and ${consolationCount} consolations`,
            );
            throw new BadRequestException(
                impossible?.message ?? 'Configuration des tableaux impossible.',
            );
        }

        this.logger.log(
            `Tournament ${tournament.code}: plan frozen with ${plan.brackets.length} brackets, ${consolationCount} consolations, ${eliminatedAfterQualifying} teams stopped after the qualifiers`,
        );
        return await this.tournamentRepo.save({
            ...tournament,
            configuration: {
                ...tournament.configuration,
                competitionConfiguration: {
                    ...config,
                    consolationCount,
                    eliminatedAfterQualifying,
                    plan,
                },
            },
        });
    }

    /**
     * The plan to freeze for the confirmed choice. The launch options shown to the admin were not
     * all computed with the stored target (`recalculate` uses the registered count as its target,
     * `add_consolation` keeps the target layout plus an extra consolation), so recomputing them
     * from the choice alone would not always give back the plan the admin saw. Matching rule: the
     * plan is computed again for the registered teams with the stored configuration; the first of
     * its options with the same `consolationCount` and `eliminatedAfterQualifying` as the choice
     * gives the plan to freeze (the one the admin confirmed). A choice matching no option (e.g. an
     * old client, or a count picked by hand) is computed with the stored target and the chosen
     * values.
     */
    private planToFreeze(
        tournament: Tournament,
        config: StructuredCompetitionConfiguration,
        consolationCount: number,
        eliminatedAfterQualifying: number,
        settings: PlanSettings,
    ): Omit<TournamentPlan, 'options'> {
        const input = this.planInput(tournament, config, tournament.teams.length, settings);
        const offered = computeStructuredPlan(input).options.find(
            (option) =>
                option.consolationCount === consolationCount &&
                option.eliminatedAfterQualifying === eliminatedAfterQualifying,
        );
        const plan =
            offered?.plan ??
            computeStructuredPlan({ ...input, consolationCount, eliminatedAfterQualifying });
        return withoutOptions(plan);
    }

    private planInput(
        tournament: Tournament,
        config: StructuredCompetitionConfiguration,
        teamCount: number,
        settings: PlanSettings,
    ): StructuredPlanInput {
        return {
            teamCount,
            targetCount: tournament.configuration.maxTeamCapacity,
            consolationCount: config.consolationCount,
            numberOfQualifyingRounds: config.numberOfQualifyingRounds,
            hasChallenges: config.hasChallenges,
            hasThirdPlaceMatch: config.hasThirdPlaceMatch,
            eliminatedAfterQualifying: config.eliminatedAfterQualifying ?? 0,
            maxConsolations: settings.maxConsolations,
            thresholds: settings.thresholds,
        };
    }

    override async assignTeamsToFirstPools(tournament: Tournament): Promise<TournamentPool[]> {
        this.logger.debug('Starting assignTeamsToPools with tournament code: ' + tournament.code);

        // Qualifying always uses a single pool.
        return await this.poolService.assignTeamsToPools(tournament, SINGLE_POOL);
    }

    override async generateSessionMatches(
        tournament: Tournament,
        session: MatchesSession,
    ): Promise<TournamentMatch[]> {
        this.logger.debug(
            'Starting generateSessionMatches with tournament code: ' + tournament.code,
        );
        const config = this.getConfig(tournament);

        const qualifyingRounds = config.numberOfQualifyingRounds ?? 0;
        const isElimination = session.sessionNumber > qualifyingRounds;
        const pastMatches = tournament.matches || [];

        let partialMatches: DeepPartial<TournamentMatch>[];
        const generationStartedAt = Date.now();
        if (isElimination) {
            const ranking = this.computeGlobalRanking(tournament, pastMatches);
            const virtualPools: TournamentPool[] = await this.getOrCreateVirtualPools(
                tournament.id,
                Object.values(MatchGroupKey),
            );

            partialMatches = generateEliminationMatches(
                tournament,
                // TEMPORARY (Task 7): remove the adapter once the generation follows the plan.
                toLegacyEliminationTables(config, tournament.teams.length),
                session,
                pastMatches,
                ranking,
                virtualPools,
            );
        } else {
            partialMatches = generateQualifyingMatches(tournament, session, pastMatches);
        }
        this.logger.debug(
            `generateSessionMatches: ${partialMatches.length} matches generated in ${Date.now() - generationStartedAt} ms`,
        );

        const matches = partialMatches.map((match) => this.matchRepo.create(match));

        const assignedMatches = this.assignPlateNumbers(matches);
        return await this.matchRepo.save(assignedMatches);
    }

    /**
     * Final standings, once elimination has started. Teams are grouped by the table they ended up
     * in (principal final, then third place, then challenge, then consolante, then challenge-
     * consolante, then teams knocked out in the pools) and, within a table, ordered by how deep
     * they went: a later exit beats an earlier one, the winner of a round beats its loser, and two
     * teams out at the same round are split by the score of that match, then by their qualifying
     * seed. The aggregate `computeGlobalRanking` still seeds the brackets and is left untouched.
     */
    override computeStandings(
        tournament: Tournament,
        matches: TournamentMatch[],
    ): GlobalRankingEntry[] {
        const validatedMatches = matches.filter((m) => m.status === MatchStatus.VALIDATED);
        // Matches still to play only place the teams in their table: they count for nothing.
        const scheduledMatches = matches.filter((m) => m.status !== MatchStatus.VALIDATED);

        const base = super.computeGlobalRanking(tournament, validatedMatches);
        const seed = new Map(base.map((entry, index) => [entry.teamId, index]));
        const exits = this.eliminationExits(tournament, validatedMatches);
        this.addScheduledTables(tournament, scheduledMatches, exits);

        const placed = base
            .map((entry) => ({
                entry,
                exit: exits.get(entry.teamId),
                seed: seed.get(entry.teamId)!,
            }))
            .sort((a, b) => this.compareStandings(a, b));

        return placed.reduce<GlobalRankingEntry[]>((ranked, item, index) => {
            const rank =
                index > 0 && this.compareStandings(placed[index - 1], item) === 0
                    ? ranked[index - 1].rank
                    : index + 1;
            // Sections only once a table has started: before, it is a single ranking.
            const section = exits.size > 0 ? standingSection(item.exit) : null;
            ranked.push({ ...item.entry, rank, section });
            return ranked;
        }, []);
    }

    private compareStandings(
        a: { exit?: EliminationExit; seed: number },
        b: { exit?: EliminationExit; seed: number },
    ): number {
        const tableA = a.exit ? standingTable(a.exit) : POOL_ONLY_ORDER;
        const tableB = b.exit ? standingTable(b.exit) : POOL_ONLY_ORDER;
        if (tableA !== tableB) return tableA - tableB;
        // Same table: deeper round first, winner before loser, higher score first.
        const depthA = a.exit ? standingDepth(a.exit) : 0;
        const depthB = b.exit ? standingDepth(b.exit) : 0;
        if (depthA !== depthB) return depthB - depthA;
        const wonA = a.exit?.won ? 1 : 0;
        const wonB = b.exit?.won ? 1 : 0;
        if (wonA !== wonB) return wonB - wonA;
        const scoreA = a.exit?.ownScore ?? -1;
        const scoreB = b.exit?.ownScore ?? -1;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.seed - b.seed;
    }

    /**
     * Each team's terminal elimination match (the deepest round it played): which table it was in,
     * whether it won, and the points it scored there. Byes and pool matches are ignored.
     */
    /**
     * A table match not validated yet already tells where its teams stand: in that table, still in
     * the game at that round. The sections show as soon as an elimination round is launched, and a
     * team still playing ranks above those already knocked out of its table.
     */
    private addScheduledTables(
        tournament: Tournament,
        scheduledMatches: TournamentMatch[],
        exits: Map<string, EliminationExit>,
    ): void {
        const qualifyingRounds = this.getConfig(tournament).numberOfQualifyingRounds ?? 0;
        for (const match of scheduledMatches) {
            if (match.isBye || !match.teamB || match.status === MatchStatus.VALIDATED) continue;
            const session = match.sessionNumber ?? 0;
            if (session <= qualifyingRounds) continue;

            const table = (match.pool?.name ?? MatchGroupKey.PRINCIPALE) as MatchGroupKey;
            for (const teamId of [match.teamA.id, match.teamB.id]) {
                const current = exits.get(teamId);
                if (!current || session > current.session) {
                    exits.set(teamId, { table, session, won: true, ownScore: -1 });
                }
            }
        }
    }

    private eliminationExits(
        tournament: Tournament,
        matches: TournamentMatch[],
    ): Map<string, EliminationExit> {
        const qualifyingRounds = this.getConfig(tournament).numberOfQualifyingRounds ?? 0;
        const exits = new Map<string, EliminationExit>();

        const consider = (teamId: string, exit: EliminationExit): void => {
            const current = exits.get(teamId);
            if (!current || exit.session > current.session) exits.set(teamId, exit);
        };

        for (const match of matches) {
            if (match.isBye || !match.teamB) continue;
            if ((match.sessionNumber ?? 0) <= qualifyingRounds) continue;
            if (match.status !== MatchStatus.VALIDATED) continue;

            const table = (match.pool?.name ?? MatchGroupKey.PRINCIPALE) as MatchGroupKey;
            const session = match.sessionNumber!;
            const aWon = match.scoreA > match.scoreB;
            consider(match.teamA.id, { table, session, won: aWon, ownScore: match.scoreA });
            consider(match.teamB.id, { table, session, won: !aWon, ownScore: match.scoreB });
        }

        return exits;
    }

    override computeTournamentStatus(
        tournament: Tournament,
        sessions: MatchesSession[],
    ): TournamentStatusInfo {
        this.logger.debug(
            'Starting computeTournamentStatus with tournament code: ' + tournament.code,
        );
        const config = this.getConfig(tournament);

        const numberOfQualifyingRounds = config.numberOfQualifyingRounds ?? 0;
        const currentSessionNumber = this.currentSessionNumber(sessions);
        const isElimination = currentSessionNumber > numberOfQualifyingRounds;
        const allValidated = this.allMatchesValidated(sessions);
        // TEMPORARY (Task 7): remove the adapter once the status follows the plan.
        const { principalBracketSize } = toLegacyEliminationTables(
            config,
            tournament.teams?.length ?? 0,
        );
        const nbTeamStillInGame =
            principalBracketSize /
            Math.pow(2, Math.max(currentSessionNumber - (numberOfQualifyingRounds ?? 0) - 1, 0));
        const isFinal = isElimination && nbTeamStillInGame <= 2;

        return {
            currentSession: currentSessionNumber,
            phaseName: computePhaseName(
                tournament.status,
                isElimination,
                nbTeamStillInGame,
                currentSessionNumber,
                config.hasThirdPlaceMatch,
                numberOfQualifyingRounds,
            ),
            canFinishTournament: isElimination && allValidated && isFinal,
            canGenerateNewSession: allValidated && !isFinal,
        };
    }

    private async getOrCreateVirtualPools(
        tournamentId: string,
        groupKeys: MatchGroupKey[],
    ): Promise<TournamentPool[]> {
        return Promise.all(
            groupKeys.map((groupKey) => this.getOrCreateVirtualPool(tournamentId, groupKey)),
        );
    }

    private async getOrCreateVirtualPool(
        tournamentId: string,
        groupKey: MatchGroupKey,
    ): Promise<TournamentPool> {
        const existing = await this.poolRepo.findVirtualPoolByName(tournamentId, groupKey);
        if (existing) return existing;
        return this.poolRepo.save(
            this.poolRepo.create({
                tournament: { id: tournamentId } as Tournament,
                poolNumber: 0,
                name: groupKey,
            }),
        );
    }

    /** Qualifying rounds are drawn in each pool; elimination rounds come from earlier results. */
    override isDrawnSession(tournament: Tournament, sessionNumber: number): boolean {
        return sessionNumber <= (this.getConfig(tournament).numberOfQualifyingRounds ?? 0);
    }

    /**
     * The stored configuration: the fields set by the admin, normalised like a request, plus the
     * ones written at launch (which a request never carries).
     */
    private getConfig(tournament: Tournament): StructuredCompetitionConfiguration {
        const stored = tournament.configuration
            .competitionConfiguration as StructuredCompetitionConfiguration;
        const config = extractCompetitionConfiguration(
            tournament.configuration,
        ) as StructuredCompetitionConfiguration;
        if (stored.eliminatedAfterQualifying !== undefined) {
            config.eliminatedAfterQualifying = stored.eliminatedAfterQualifying;
        }
        if (stored.plan) {
            config.plan = stored.plan;
        }
        return config;
    }
}
