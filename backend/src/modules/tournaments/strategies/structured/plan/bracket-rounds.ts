import { BracketRound, FillLevel, FillThresholds } from './plan.types';

/**
 * Elimination rounds of a bracket of `capacity` slots holding `count` teams. The tree is fixed: the
 * first round has `capacity / 2` slots, `capacity - count` of them byes (the exempt team goes
 * through without playing) and `count - capacity / 2` real matches; every next round is full.
 */
export function bracketRounds(count: number, capacity: number): BracketRound[] {
    const rounds: BracketRound[] = [];
    let teams = count;
    let first = true;
    while (teams >= 2) {
        const matches = first ? count - capacity / 2 : teams / 2;
        const byes = first ? capacity - count : 0;
        rounds.push({ teams, matches, byes, losers: matches });
        teams = capacity / 2 ** rounds.length;
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
