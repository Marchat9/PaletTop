import { Logger } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { StructuredCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { MatchGroupKey } from 'src/enum/tounament.enum';
import { TournamentRepository } from 'src/modules/tournaments/repositories/tournament.repository';
import { extractCompetitionConfiguration } from 'src/modules/tournaments/utils/tournament.utils';
import { DeepPartial } from 'typeorm';
import { MatchRepository } from '../../../tournaments/repositories/match.repository';
import { PoolRepository } from '../../../tournaments/repositories/pool.repository';
import { GlobalRankingEntry } from '../../../tournaments/responses/ranking.dto';
import { TournamentStatusInfo } from '../../../tournaments/responses/tournament-status.dto';
import { PoolService } from '../../../tournaments/services/pool.service';
import { computePrincipalBracketSize } from '../../../tournaments/utils/bracket.utils';
import { TournamentStrategy } from '../tournament-strategy.abstract';
import {
    computePhaseName,
    generateEliminationMatches,
    generateQualifyingMatches,
} from './structured-session.utils';

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

    override async prepareTournamentStart(tournament: Tournament): Promise<Tournament> {
        this.logger.debug(
            'Starting prepareTournamentStart with tournament code: ' + tournament.code,
        );
        const config = this.getConfig(tournament);

        // A provided bracket size is only trusted when it is a power of two within [2, teams];
        // anything else (odd number, larger than the field, missing) falls back to the automatic
        // size. The whole elimination structure assumes a power-of-two principal bracket.
        const teamCount = tournament.teams.length;
        const provided = config.principalBracketSize;
        const isValid =
            !!provided &&
            Number.isInteger(provided) &&
            provided >= 2 &&
            provided <= teamCount &&
            (provided & (provided - 1)) === 0;
        config.principalBracketSize = isValid ? provided : computePrincipalBracketSize(teamCount);

        return await this.tournamentRepo.save({
            ...tournament,
            configuration: {
                ...tournament.configuration,
                competitionConfiguration: config,
            },
        });
    }

    override async assignTeamsToFirstPools(tournament: Tournament): Promise<TournamentPool[]> {
        this.logger.debug('Starting assignTeamsToPools with tournament code: ' + tournament.code);
        const config = this.getConfig(tournament);

        return await this.poolService.assignTeamsToPools(tournament, config.numberOfPools);
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
                config,
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
        const base = super.computeGlobalRanking(tournament, matches);
        const seed = new Map(base.map((entry, index) => [entry.teamId, index]));
        const exits = this.eliminationExits(tournament, matches);

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
            ranked.push({ ...item.entry, rank });
            return ranked;
        }, []);
    }

    private compareStandings(
        a: { exit?: EliminationExit; seed: number },
        b: { exit?: EliminationExit; seed: number },
    ): number {
        const tableA = a.exit ? TABLE_STANDING_ORDER[a.exit.table] : POOL_ONLY_ORDER;
        const tableB = b.exit ? TABLE_STANDING_ORDER[b.exit.table] : POOL_ONLY_ORDER;
        if (tableA !== tableB) return tableA - tableB;
        // Same table: deeper round first, winner before loser, higher score first.
        const depthA = a.exit?.session ?? 0;
        const depthB = b.exit?.session ?? 0;
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
        const nbTeamStillInGame =
            (config.principalBracketSize ?? 0) /
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

    private getConfig(tournament: Tournament): StructuredCompetitionConfiguration {
        return extractCompetitionConfiguration(
            tournament.configuration,
        ) as StructuredCompetitionConfiguration;
    }
}
