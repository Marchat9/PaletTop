import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { StructuredCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatus } from 'src/enum/status.enum';
import { MatchGroupKey } from 'src/enum/tounament.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import { generateMatchesInPool } from 'src/modules/tournaments/utils/match.utils';
import { extractContraintConfig } from 'src/modules/tournaments/utils/tournament.utils';
import { toPoolRef } from 'src/modules/tournaments/utils/type-orm-ref.utils';
import { DeepPartial } from 'typeorm';
import { GlobalRankingEntry } from '../../../tournaments/responses/ranking.dto';

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
            poolRef: toPoolRef(pool),
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
    // Each table is seeded from the teams that actually belong to it - the winners of its own
    // previous round, and for a repechage table the first-round losers of its parent - NOT by
    // re-slicing the global ranking. Once challenge/consolante tables exist, a repechage winner
    // climbs the aggregate ranking above a principal semi-finalist, so slicing pulled the wrong
    // teams into the wrong tables. Winner-tracking keeps every team in exactly one table.
    const constraintConfig: ConstraintConfig = extractContraintConfig(tournament.configuration);
    const qualifyingRounds = competitionConfig.numberOfQualifyingRounds ?? 0;
    const principalBracketSize = competitionConfig.principalBracketSize ?? tournament.teams.length;
    const elimSession = session.sessionNumber - qualifyingRounds; // 1 = first elimination round
    const teamById = new Map(tournament.teams.map((t) => [t.id, t]));

    // Winners (byes included) and losers of a table at a given elimination round, resolved to the
    // full team entities (matches only carry id/name/code refs, and the draw needs the players).
    const roundResults = (groupKey: MatchGroupKey, atElimSession: number) => {
        const sessionNumber = qualifyingRounds + atElimSession;
        const tableMatches = pastMatches.filter(
            (m) => m.pool?.name === groupKey && m.sessionNumber === sessionNumber,
        );
        const resolve = (team: Team): Team | undefined => teamById.get(team.id);
        const winners: Team[] = [];
        const losers: Team[] = [];
        for (const m of tableMatches) {
            if (m.isBye || !m.teamB) {
                const bye = resolve(m.teamA);
                if (bye) winners.push(bye);
                continue;
            }
            const [winner, loser] = m.scoreA > m.scoreB ? [m.teamA, m.teamB] : [m.teamB, m.teamA];
            const winnerTeam = resolve(winner);
            const loserTeam = resolve(loser);
            if (winnerTeam) winners.push(winnerTeam);
            if (loserTeam) losers.push(loserTeam);
        }
        return { winners, losers };
    };

    const seededRanking = [...globalRanking].sort((a, b) => a.rank - b.rank);
    const rankSlice = (from: number, to: number): Team[] =>
        seededRanking
            .slice(from, to)
            .map((e) => teamById.get(e.teamId))
            .filter((t): t is Team => !!t);

    const tableData: { teams: Team[]; groupKey: MatchGroupKey }[] = [];
    const addTable = (enabled: boolean, groupKey: MatchGroupKey, teams: Team[]): void => {
        if (enabled && teams.length >= 2) tableData.push({ teams, groupKey });
    };

    // Principal: top P at the first round, then its own winners.
    const principalTeams =
        elimSession === 1
            ? rankSlice(0, principalBracketSize)
            : roundResults(MatchGroupKey.PRINCIPALE, elimSession - 1).winners;
    addTable(true, MatchGroupKey.PRINCIPALE, principalTeams);

    // Consolante: the field below the principal bracket at the first round, then its own winners.
    const consolanteTeams =
        elimSession === 1
            ? rankSlice(principalBracketSize, tournament.teams.length)
            : roundResults(MatchGroupKey.CONSOLANTE, elimSession - 1).winners;
    addTable(competitionConfig.hasConsolanteTable, MatchGroupKey.CONSOLANTE, consolanteTeams);

    // Challenge: repechage of the principal's first-round losers, then its own winners. Starts one
    // round after the principal (there are no losers to catch before the first principal round).
    if (elimSession >= 2) {
        const challengeTeams =
            elimSession === 2
                ? roundResults(MatchGroupKey.PRINCIPALE, 1).losers
                : roundResults(MatchGroupKey.CHALLENGE, elimSession - 1).winners;
        addTable(
            competitionConfig.hasChallengePrincipaleTable,
            MatchGroupKey.CHALLENGE,
            challengeTeams,
        );

        const challengeConsolanteTeams =
            elimSession === 2
                ? roundResults(MatchGroupKey.CONSOLANTE, 1).losers
                : roundResults(MatchGroupKey.CHALLENGE_CONSOLANTE, elimSession - 1).winners;
        addTable(
            competitionConfig.hasChallengeConsolanteTable,
            MatchGroupKey.CHALLENGE_CONSOLANTE,
            challengeConsolanteTeams,
        );
    }

    // Third-place match (principal only): the two losers of the principal semi-finals, once the
    // principal is down to its final. They are the losers of the previous principal round.
    if (competitionConfig.hasThirdPlaceMatch && principalTeams.length === 2) {
        const semiFinalLosers = roundResults(MatchGroupKey.PRINCIPALE, elimSession - 1).losers;
        addTable(true, MatchGroupKey.THIRD_PLACE_MATCH, semiFinalLosers);
    }

    return tableData.flatMap(({ teams, groupKey }) =>
        generateMatchesInPool(
            virtualPools.find((vp) => vp.name === groupKey)!,
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
    currentSessionNumber: number,
    hasThirdPlaceMatch: boolean,
    numberOfQualifyingRounds: number,
): string {
    switch (true) {
        case tournamentStatus === TournamentStatus.DRAFT:
        case tournamentStatus === TournamentStatus.CANCELLED:
        default:
            return '';

        case tournamentStatus === TournamentStatus.COMPLETED:
            return 'Tournoi terminé';

        case tournamentStatus === TournamentStatus.ACTIVE && !isElimination:
            return `Phase qualificative ${currentSessionNumber}/${numberOfQualifyingRounds}`;

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
