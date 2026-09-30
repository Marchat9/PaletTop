import { EliminationTableau, MatchGroupKey } from 'src/enum/tounament.enum';

export type RankIndexByEliminationTable = {
    [key in EliminationTableau]: {
        rankIndexMin: number;
        rankIndexMax: number;
        groupKey: MatchGroupKey;
    } | null;
};

// --- Bracket sizes ---

/**
 * Size of the principal bracket: smallest power of two >= N/2.
 * e.g. 14 -> 8 | 62 -> 32 | 10 -> 8
 */
export function computePrincipalBracketSize(teamCount: number): number {
    return Math.pow(2, Math.max(1, Math.ceil(Math.log2(teamCount / 2))));
}

export function computeTableTeamRankIndex(
    teamsLength: number,
    sessionNumber: number,
    numberOfQualifyingRounds: number,
    principalBracketSize: number,
): RankIndexByEliminationTable {
    // Each table is a real single-elimination bracket over a fixed band of the qualifying ranking.
    // The band's start never moves; only its end shrinks by half every elimination session, so the
    // top half (the winners, who rose in the ranking) carries on and the bottom half drops out.
    //
    //   principale            ranks [0                       , P / 2^(e-1))
    //   challenge principale  ranks [P/2                      , P/2 + P / 2^(e-1))       (e >= 2)
    //   consolante            ranks [P                        , P + B / 2^(e-1))
    //   challenge consolante  ranks [P + B/2                  , P + B/2 + B / 2^(e-1))   (e >= 2)
    //
    // with P the principal bracket size, B = teamsLength - P the field below it, and e the
    // elimination session number (1 = first elimination round). The challenge tables are the
    // repechage of each bracket's first-round losers, so they only start at the second elimination
    // session. See computeTableTeamRankIndex specs for the 16- and 32-team walk-throughs.
    const eliminationSessionNumber: number = Math.max(
        sessionNumber - (numberOfQualifyingRounds ?? 0),
        0,
    );
    const power: number = eliminationSessionNumber - 1;
    const shrink = (size: number): number => Math.floor(size / Math.pow(2, power));

    const belowPrincipal = teamsLength - principalBracketSize;

    const principalMinRank = 0;
    const principalMaxRank = shrink(principalBracketSize);

    const challengePrincipalMinRank = principalBracketSize / 2;
    const challengePrincipalMaxRank = challengePrincipalMinRank + shrink(principalBracketSize);

    const consolanteMinRank = principalBracketSize;
    const consolanteMaxRank = Math.min(teamsLength, consolanteMinRank + shrink(belowPrincipal));

    const challengeConsolanteMinRank = principalBracketSize + Math.floor(belowPrincipal / 2);
    const challengeConsolanteMaxRank = Math.min(
        teamsLength,
        challengeConsolanteMinRank + shrink(belowPrincipal),
    );

    const hasChallenges = eliminationSessionNumber > 1;
    const couldHaveAtLeastOneMatch = (maxIndex: number, minIndex: number) =>
        maxIndex - minIndex > 1;

    return {
        [EliminationTableau.PRINCIPALE]: {
            rankIndexMin: principalMinRank,
            rankIndexMax: principalMaxRank,
            groupKey: MatchGroupKey.PRINCIPALE,
        },
        // Once a bracket is down to a single team it is over (no match left to play): the
        // consolante can run out of rounds before the principal does - "fin des consolantes".
        [EliminationTableau.CONSOLANTE]: couldHaveAtLeastOneMatch(
            consolanteMaxRank,
            consolanteMinRank,
        )
            ? {
                  rankIndexMin: consolanteMinRank,
                  rankIndexMax: consolanteMaxRank,
                  groupKey: MatchGroupKey.CONSOLANTE,
              }
            : null,
        [EliminationTableau.CHALLENGE]:
            hasChallenges &&
            couldHaveAtLeastOneMatch(challengePrincipalMaxRank, challengePrincipalMinRank)
                ? {
                      rankIndexMin: challengePrincipalMinRank,
                      rankIndexMax: challengePrincipalMaxRank,
                      groupKey: MatchGroupKey.CHALLENGE,
                  }
                : null,
        [EliminationTableau.CHALLENGE_CONSOLANTE]:
            hasChallenges &&
            couldHaveAtLeastOneMatch(challengeConsolanteMaxRank, challengeConsolanteMinRank)
                ? {
                      rankIndexMin: challengeConsolanteMinRank,
                      rankIndexMax: challengeConsolanteMaxRank,
                      groupKey: MatchGroupKey.CHALLENGE_CONSOLANTE,
                  }
                : null,
    };
}
