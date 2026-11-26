/**
 * Function to generation tournament matches for a pool
 *
 * @param pool
 * @param teams
 * @param tournament
 * @param session
 * @param constraintConfig
 * @param pastMatches
 * @param byeRanking when given, a tie on the fewest byes goes to the best ranked team (else random)
 * @param byeScore what the bye of an odd pool is stored as
 * @param random seeded random function: the draw of the bye and of the pairs
 * @returns DeepPartial<TournamentMatch>[]
 */

import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import {
    buildByeMatchData,
    ByeScore,
    NO_VALUE_BYE,
    selectByeTeam,
} from 'src/modules/tournaments/utils/bye.utils';
import { generatePairsWithContraints } from 'src/modules/tournaments/utils/draw.utils';
import { GlobalRankingEntry } from 'src/modules/tournaments/responses/ranking.dto';
import {
    toSessionRef,
    toTeamRef,
    toTournamentRef,
} from 'src/modules/tournaments/utils/type-orm-ref.utils';
import { shuffleFisherYates } from 'src/modules/tournaments/utils/global.utils';
import { DeepPartial } from 'typeorm';

// A match only ever needs id/name/code from its teams (see toSessionMatchResponseDto,
// toPlayerMatchDto). Passing the full Team entity is unsafe: Team's @BeforeInsert/@BeforeUpdate
// hook (validatePlayers) sets `player.team = this` on every player, so a team fetched with its
// players loaded becomes self-referencing (team.players[i].team === team) the moment it's
// saved — and that cycle sends matchRepo.create() into infinite recursion once a match carries
// that team as teamA/teamB.

export function generateMatchesInPool(
    pool: TournamentPool,
    teams: Team[],
    tournament: Tournament,
    session: MatchesSession,
    constraintConfig: ConstraintConfig,
    pastMatches: TournamentMatch[],
    byeScore: ByeScore,
    random: () => number,
    byeRanking?: GlobalRankingEntry[],
): DeepPartial<TournamentMatch>[] {
    const allMatches: DeepPartial<TournamentMatch>[] = [];

    const tournamentRef: Tournament = toTournamentRef(tournament);
    const sessionRef: MatchesSession = toSessionRef(session);
    const currentTeams = [...teams];

    // Byes
    if (currentTeams.length % 2 !== 0) {
        const byeTeam = selectByeTeam(currentTeams, pastMatches, byeRanking, random);
        allMatches.push(
            buildByeMatchData(
                toTeamRef(byeTeam),
                tournamentRef,
                pool,
                sessionRef,
                session.sessionNumber,
                byeScore,
            ),
        );
        currentTeams.splice(
            currentTeams.findIndex((t) => t.id === byeTeam.id),
            1,
        );
    }

    // Matches
    const pairs = generatePairsWithContraints(constraintConfig, currentTeams, pastMatches, random);

    for (const [teamA, teamB] of pairs) {
        allMatches.push({
            tournament: tournamentRef,
            session: sessionRef,
            sessionNumber: session.sessionNumber,
            pool: pool,
            teamA: toTeamRef(teamA),
            teamB: toTeamRef(teamB),
            isBye: false,
            status: MatchStatus.PENDING,
        });
    }
    return allMatches;
}

/**
 * Orders teams by their ranking; teams tied on rank are ordered by id so the result
 * never depends on the order the teams were loaded in. Teams missing from the ranking are dropped.
 */
export function orderTeamsByRanking(teams: Team[], ranking: GlobalRankingEntry[]): Team[] {
    const teamsById = new Map(teams.map((team) => [team.id, team]));
    return [...ranking]
        .sort((a, b) => a.rank - b.rank || a.teamId.localeCompare(b.teamId))
        .map((entry) => teamsById.get(entry.teamId))
        .filter((team): team is Team => !!team);
}

/**
 * Matches of already decided pairs, in the given order (plates follow it), then the bye of
 * `byeTeam` last, stored as `byeScore`.
 */
export function generateMatchesFromPairs(
    pool: TournamentPool,
    pairs: [Team, Team][],
    byeTeam: Team | null,
    byeScore: ByeScore,
    tournament: Tournament,
    session: MatchesSession,
): DeepPartial<TournamentMatch>[] {
    const tournamentRef: Tournament = toTournamentRef(tournament);
    const sessionRef: MatchesSession = toSessionRef(session);

    const allMatches: DeepPartial<TournamentMatch>[] = pairs.map(([teamA, teamB]) => ({
        tournament: tournamentRef,
        session: sessionRef,
        sessionNumber: session.sessionNumber,
        pool,
        teamA: toTeamRef(teamA),
        teamB: toTeamRef(teamB),
        isBye: false,
        status: MatchStatus.PENDING,
    }));

    if (byeTeam) {
        allMatches.push(
            buildByeMatchData(
                toTeamRef(byeTeam),
                tournamentRef,
                pool,
                sessionRef,
                session.sessionNumber,
                byeScore,
            ),
        );
    }
    return allMatches;
}

/**
 * Pairs each team with its ranking neighbour (1st vs 2nd, 3rd vs 4th, ...), ignoring the draw
 * constraints. With an odd number of teams, the last-ranked one gets a bye worth nothing (0-0).
 * Matches keep the ranking order so plate numbers follow it (plate 1 = 1st vs 2nd).
 */
export function generateMatchesByRanking(
    pool: TournamentPool,
    rankedTeams: Team[],
    tournament: Tournament,
    session: MatchesSession,
): DeepPartial<TournamentMatch>[] {
    const pairs: [Team, Team][] = [];
    for (let i = 0; i + 1 < rankedTeams.length; i += 2) {
        pairs.push([rankedTeams[i], rankedTeams[i + 1]]);
    }
    const byeTeam = rankedTeams.length % 2 !== 0 ? rankedTeams[rankedTeams.length - 1] : null;
    return generateMatchesFromPairs(pool, pairs, byeTeam, NO_VALUE_BYE, tournament, session);
}

/** Rank position of every team of `ranking`, best first (ties keep the ranking order). */
function rankingPositions(ranking: GlobalRankingEntry[]): Map<string, number> {
    return new Map(
        [...ranking].sort((a, b) => a.rank - b.rank).map((entry, index) => [entry.teamId, index]),
    );
}

/**
 * Orders the matches of a round so that plate 1 is the match of the best ranked team, then the
 * plates go down the ranking. A match counts for its best ranked team; a team missing from the
 * ranking counts as last. Byes come last (they get no plate). The sort is stable.
 */
export function orderMatchesByRanking(
    matches: DeepPartial<TournamentMatch>[],
    ranking: GlobalRankingEntry[],
): DeepPartial<TournamentMatch>[] {
    const positions = rankingPositions(ranking);
    const positionOf = (teamId?: string): number =>
        (teamId === undefined ? undefined : positions.get(teamId)) ?? Number.MAX_SAFE_INTEGER;
    const bestPosition = (match: DeepPartial<TournamentMatch>): number =>
        Math.min(positionOf(match.teamA?.id), positionOf(match.teamB?.id));
    return [...matches].sort((a, b) => {
        if (!!a.isBye !== !!b.isBye) return a.isBye ? 1 : -1;
        return bestPosition(a) - bestPosition(b);
    });
}

/**
 * Orders the matches of a first round (no ranking yet): the real matches shuffled with the seeded
 * `random`, so plate 1 is not always the first pair drawn; byes last.
 */
export function orderFirstRoundMatches(
    matches: DeepPartial<TournamentMatch>[],
    random: () => number,
): DeepPartial<TournamentMatch>[] {
    const real = matches.filter((match) => !match.isBye);
    const byes = matches.filter((match) => match.isBye);
    return [...shuffleFisherYates(real, random), ...byes];
}
