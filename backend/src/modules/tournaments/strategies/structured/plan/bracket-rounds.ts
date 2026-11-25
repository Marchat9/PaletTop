import { BracketRound, FillLevel, FillThresholds } from './plan.types';

/** Elimination rounds of a bracket of `capacity` slots holding `count` teams. */
export function bracketRounds(count: number, capacity: number): BracketRound[] {
    const rounds: BracketRound[] = [];
    let teams = count;
    let first = true;
    while (teams >= 2) {
        const matches = Math.floor(teams / 2);
        const byes = teams % 2;
        const winners = matches + byes;
        let next = winners;
        let bestLosersIn = 0;
        if (first && capacity / 2 > winners) {
            bestLosersIn = capacity / 2 - winners;
            next = capacity / 2;
        }
        rounds.push({ teams, matches, byes, losers: matches, bestLosersIn });
        teams = next;
        first = false;
    }
    return rounds;
}

export function fillLevel(count: number, capacity: number, thresholds: FillThresholds): FillLevel {
    const ratio = count / capacity;
    if (ratio >= thresholds.okRatio) {
        return 'ok';
    }
    return ratio >= thresholds.warningRatio ? 'mid' : 'low';
}
