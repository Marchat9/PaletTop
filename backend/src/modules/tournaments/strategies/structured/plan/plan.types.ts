/** Ratios (count / capacity) at which a bracket is considered full enough or only partly filled. */
export interface FillThresholds {
    okRatio: number;
    warningRatio: number;
}

export type FillLevel = 'ok' | 'mid' | 'low';

/** One bracket of the split: `count` teams in a bracket of `capacity` slots (a power of 2). */
export interface BracketSize {
    capacity: number;
    count: number;
    /** True for the bracket added on top of the target layout to host the surplus teams. */
    extra?: boolean;
}

/** One elimination round of a bracket. */
export interface BracketRound {
    teams: number;
    matches: number;
    byes: number;
    losers: number;
    /** Best losers brought back to fill the second round of a partial bracket. */
    bestLosersIn: number;
}
