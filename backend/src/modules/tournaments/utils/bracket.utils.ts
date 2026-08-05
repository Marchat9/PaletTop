import { EliminationTableau, MatchGroupKey } from 'src/enum/tounament.enum';

export type RankIndexByEliminationTable = {
    [key in EliminationTableau]: {
        rankIndexMin: number;
        rankIndexMax: number;
        groupKey: MatchGroupKey;
    } | null;
};

// --- Taille des brackets ---

/**
 * Calcule la taille du tableau Principal : plus petite puissance de 2 >= N/2.
 * Ex : 14 → 8 | 62 → 32 | 10 → 8
 */
export function computePrincipalBracketSize(teamCount: number): number {
    return Math.pow(2, Math.ceil(Math.log2(teamCount / 2)));
}

/**
 * Calcule combien d'équipes avancent au round suivant dans un bracket non-puissance-de-2.
 * Plus grande puissance de 2 <= N.
 * Ex : 6 → 4 | 14 → 8 | 30 → 16
 */
export function computeConsolanteAdvancingCount(teamCount: number): number {
    return Math.pow(2, Math.floor(Math.log2(teamCount)));
}

export function computeTableTeamRankIndex(
    teamsLength: number,
    sessionNumber: number,
    numberOfQualifyingRounds: number,
    principalBracketSize: number,
): RankIndexByEliminationTable {
    const eliminationSessionNumber: number = Math.max(
        sessionNumber - (numberOfQualifyingRounds ?? 0),
        0,
    );
    const power: number = eliminationSessionNumber - 1;

    const principalMinRank = 0;
    const principalMaxRank = principalBracketSize / Math.pow(2, power);

    const challengePrincipalMinRank = principalBracketSize / 2;
    const challengePrincipalMaxRank =
        principalBracketSize / 2 + principalBracketSize / Math.pow(2, power);

    const consolanteMinRank = principalBracketSize;
    const consolanteMaxRank = Math.min(
        teamsLength,
        principalBracketSize +
            computeConsolanteAdvancingCount(
                (teamsLength - principalBracketSize) / Math.pow(2, power - 1),
            ),
    );

    const challengeConsolanteMinRank =
        principalBracketSize + computeConsolanteAdvancingCount(teamsLength - principalBracketSize);
    const challengeConsolanteMaxRank = Math.min(
        teamsLength,
        challengeConsolanteMinRank +
            computeConsolanteAdvancingCount(
                (teamsLength - principalBracketSize) / Math.pow(2, power - 1),
            ),
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
        [EliminationTableau.CONSOLANTE]: {
            rankIndexMin: consolanteMinRank,
            rankIndexMax: consolanteMaxRank,
            groupKey: MatchGroupKey.CONSOLANTE,
        },
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
