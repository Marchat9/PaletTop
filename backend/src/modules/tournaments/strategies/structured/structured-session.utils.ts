import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { TournamentConfiguration } from 'src/entities/tournament-configuration.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { EliminationTableau, MatchGroupKey } from 'src/enum/tounament.enum';
import { DeepPartial } from 'typeorm';
import { GlobalRankingEntry } from '../../../tournaments/responses/ranking.dto';
import { computeTableTeamRankIndex } from '../../../tournaments/utils/bracket.utils';
import { buildByeMatchData, selectByeTeam } from '../../../tournaments/utils/bye.utils';
import {
    ConstraintConfig,
    generatePairsWithContraints,
} from 'src/modules/tournaments/utils/draw.utils';
import { StructuredCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';

function extractContraintConfig(configuration: TournamentConfiguration): ConstraintConfig {
    return {
        allowRematch: configuration.rematch ?? false,
        allowMatchAgainstFullSameClub: configuration.matchAgainstFullSameClub ?? false,
        allowMatchAgainstPartialSameClub: configuration.matchAgainstPartialSameClub ?? false,
    };
}

export function extractCompetitionConfiguration(
    config: TournamentConfiguration,
): StructuredCompetitionConfiguration {
    return config.competitionConfiguration as StructuredCompetitionConfiguration;
}

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
    session: MatchesSession,
    pastMatches: TournamentMatch[],
    globalRanking: GlobalRankingEntry[],
    virtualPools: TournamentPool[],
): DeepPartial<TournamentMatch>[] {
    // Config
    const constraintConfig: ConstraintConfig = extractContraintConfig(tournament.configuration);
    const competitionConfig: StructuredCompetitionConfiguration = extractCompetitionConfiguration(
        tournament.configuration,
    );
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

/**
 * Function to generation tournament matches for a pool
 *
 * @param pool
 * @param teams
 * @param tournament
 * @param session
 * @param constraintConfig
 * @param pastMatches
 * @returns DeepPartial<TournamentMatch>[]
 */

function generateMatchesInPool(
    poll: TournamentPool,
    teams: Team[],
    tournament: Tournament,
    session: MatchesSession,
    constraintConfig: ConstraintConfig,
    pastMatches: TournamentMatch[],
): DeepPartial<TournamentMatch>[] {
    const allMatches: DeepPartial<TournamentMatch>[] = [];

    const tournamentRef: Tournament = { id: tournament.id } as Tournament;
    const sessionRef: MatchesSession = { id: session.id } as MatchesSession;
    const currentTeams = [...teams];

    // Byes
    if (currentTeams.length % 2 !== 0) {
        const byeTeam = selectByeTeam(currentTeams, []);
        allMatches.push(
            buildByeMatchData(
                { id: byeTeam.id } as Team,
                tournamentRef,
                poll,
                sessionRef,
                tournament.configuration.pointsPerGame,
                session.sessionNumber,
            ),
        );
        currentTeams.splice(
            currentTeams.findIndex((t) => t.id === byeTeam.id),
            1,
        );
    }

    // Matches
    for (const [teamA, teamB] of generatePairsWithContraints(
        constraintConfig,
        currentTeams,
        pastMatches,
    )) {
        allMatches.push({
            tournament: tournamentRef,
            session: sessionRef,
            sessionNumber: session.sessionNumber,
            pool: poll,
            teamA: { id: teamA.id } as Team,
            teamB: { id: teamB.id } as Team,
            isBye: false,
            status: MatchStatus.PENDING,
        });
    }
    return allMatches;
}
