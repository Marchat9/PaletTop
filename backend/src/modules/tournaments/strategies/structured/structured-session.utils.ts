import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { StructuredCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatus } from 'src/enum/status.enum';
import { EliminationTableau, MatchGroupKey } from 'src/enum/tounament.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import { generateMatchesInPool } from 'src/modules/tournaments/utils/match.utils';
import { extractContraintConfig } from 'src/modules/tournaments/utils/tournament.utils';
import { DeepPartial } from 'typeorm';
import { GlobalRankingEntry } from '../../../tournaments/responses/ranking.dto';
import { computeTableTeamRankIndex } from '../../../tournaments/utils/bracket.utils';

/**
 * Permet de générer les matches de qualification suivant le nombre de pool.
 * @param tournament
 * @param session
 * @param pastMatches
 * @returns DeepPartial<TournamentMatch>[]
 */
export function generateQualifyingMatches(
    tournament: Tournament,
    session: MatchesSession,
    pastMatches: TournamentMatch[],
): DeepPartial<TournamentMatch>[] {
    const constraintConfig: ConstraintConfig = extractContraintConfig(tournament.configuration);

    return tournament.pools
        .map((pool) => ({
            poolRef: { id: pool.id } as TournamentPool,
            poolPastMatches: pastMatches.filter((m) => m.pool?.id === pool.id),
            poolTeams: pool.teams,
        }))
        .flatMap(({ poolRef, poolPastMatches, poolTeams }) =>
            generateMatchesInPool(
                poolRef,
                poolTeams,
                tournament,
                session,
                constraintConfig,
                poolPastMatches,
            ),
        );
}

export function generateEliminationMatches(
    tournament: Tournament,
    competitionConfig: StructuredCompetitionConfiguration,
    session: MatchesSession,
    pastMatches: TournamentMatch[],
    globalRanking: GlobalRankingEntry[],
    virtualPools: TournamentPool[],
): DeepPartial<TournamentMatch>[] {
    // Config
    const constraintConfig: ConstraintConfig = extractContraintConfig(tournament.configuration);
    const activeTableaux: EliminationTableau[] = [
        EliminationTableau.PRINCIPALE,
        ...(competitionConfig.hasConsolanteTable ? [EliminationTableau.CONSOLANTE] : []),
        ...(competitionConfig.hasChallengePrincipaleTable ? [EliminationTableau.CHALLENGE] : []),
        ...(competitionConfig.hasChallengeConsolanteTable
            ? [EliminationTableau.CHALLENGE_CONSOLANTE]
            : []),
    ];

    // compute rank index for all elimination table
    const allRankIndex = computeTableTeamRankIndex(
        tournament.teams.length,
        session.sessionNumber,
        competitionConfig.numberOfQualifyingRounds!,
        competitionConfig.principalBracketSize!,
    );
    const sortedRanking = globalRanking.sort((a, b) => a.rank - b.rank);

    // Select valid teams for each tournament configured elimination table.
    const tableData = activeTableaux
        .filter((tableKey) => !!allRankIndex[tableKey])
        .map((tableKey) => ({
            teams: sortedRanking
                .slice(allRankIndex[tableKey]!.rankIndexMin, allRankIndex[tableKey]!.rankIndexMax)
                .map((e) => tournament.teams.find((t) => t.id === e.teamId)!),
            virtualPool: virtualPools.find((vp) => vp.name === allRankIndex[tableKey]!.groupKey)!,
        }));

    // Add custom third place table if configured.
    if (
        allRankIndex[EliminationTableau.PRINCIPALE]?.rankIndexMax === 2 &&
        competitionConfig.hasThirdPlaceMatch
    ) {
        tableData.push({
            teams: sortedRanking
                .slice(2, 4)
                .map((e) => tournament.teams.find((t) => t.id === e.teamId)!),
            virtualPool: virtualPools.find((vp) => vp.name === MatchGroupKey.THIRD_PLACE_MATCH)!,
        });
    }

    // Generate matches
    return tableData.flatMap(({ teams, virtualPool }) =>
        generateMatchesInPool(
            virtualPool,
            teams,
            tournament,
            session,
            constraintConfig,
            pastMatches,
        ),
    );
}

export function computePhaseName(
    tournamentStatus: TournamentStatus,
    isElimination: boolean,
    nbTeamStillInGame: number,
    hasThirdPlaceMatch: boolean,
): string {
    switch (true) {
        case tournamentStatus === TournamentStatus.DRAFT:
        case tournamentStatus === TournamentStatus.CANCELLED:
        case tournamentStatus === TournamentStatus.COMPLETED:
        default:
            return '';

        case tournamentStatus === TournamentStatus.ACTIVE && !isElimination:
            return 'Phase qualificative';

        case tournamentStatus === TournamentStatus.ACTIVE &&
            isElimination &&
            nbTeamStillInGame === 2:
            return `Finale${hasThirdPlaceMatch ? ' + Petite Finale' : ''}`;

        case tournamentStatus === TournamentStatus.ACTIVE &&
            isElimination &&
            nbTeamStillInGame === 4:
            return 'Demi-Finale';

        case tournamentStatus === TournamentStatus.ACTIVE && isElimination && nbTeamStillInGame > 4:
            return 'Phase éliminatoire';
    }
}
