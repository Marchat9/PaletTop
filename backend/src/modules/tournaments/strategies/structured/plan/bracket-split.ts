import { BracketSize } from './plan.types';

const MAX_CAPACITY = 1024;

/** Smallest power of 2 (at least 2) able to host `n` teams. */
export function powerOfTwoCeil(n: number): number {
    let capacity = 2;
    while (capacity < n) {
        capacity *= 2;
    }
    return capacity;
}

interface SplitCandidate {
    capacities: number[];
    counts: number[];
    maxCapacity: number;
    lastFill: number;
}

/**
 * Splits `teamCount` teams into `bracketCount` brackets whose capacities are non-increasing powers
 * of 2. Every bracket but the last is full; the last one takes the remainder. Picks the split with
 * the smallest biggest bracket, then the emptiest last bracket. Returns null when impossible.
 */
export function splitTeams(teamCount: number, bracketCount: number): BracketSize[] | null {
    if (bracketCount === 1) {
        return teamCount >= 2 ? [{ capacity: powerOfTwoCeil(teamCount), count: teamCount }] : null;
    }

    const powers: number[] = [];
    for (let c = 2; c <= MAX_CAPACITY; c *= 2) {
        powers.push(c);
    }

    let best: SplitCandidate | null = null;

    const explore = (prefix: number[], sum: number): void => {
        const maxPrevious = prefix.length ? prefix[prefix.length - 1] : Infinity;
        if (prefix.length === bracketCount - 1) {
            const remainder = teamCount - sum;
            if (remainder < 2) {
                return;
            }
            const capacity = powerOfTwoCeil(remainder);
            if (capacity > maxPrevious) {
                return;
            }
            const capacities = [...prefix, capacity];
            const maxCapacity = Math.max(...capacities);
            const lastFill = remainder / capacity;
            if (
                !best ||
                maxCapacity < best.maxCapacity ||
                (maxCapacity === best.maxCapacity && lastFill < best.lastFill)
            ) {
                best = { capacities, counts: [...prefix, remainder], maxCapacity, lastFill };
            }
            return;
        }
        for (const power of powers) {
            if (power > maxPrevious || sum + power >= teamCount) {
                break;
            }
            explore([...prefix, power], sum + power);
        }
    };

    explore([], 0);

    const found = best as SplitCandidate | null;
    if (!found) {
        return null;
    }
    return found.capacities.map((capacity, i) => ({ capacity, count: found.counts[i] }));
}

export interface TeamLayout {
    brackets: BracketSize[] | null;
    capacitySum: number;
    noRoomForExtra?: boolean;
}

/**
 * Lays `teamCount` teams out on the brackets planned for `targetCount` teams. Surplus teams go
 * to an extra bracket when there is room for one (fewer than `maxBrackets`), otherwise the teams
 * are simply re-split.
 */
export function layoutTeams(
    teamCount: number,
    targetCount: number,
    bracketCount: number,
    maxBrackets: number,
): TeamLayout {
    const target = splitTeams(targetCount, bracketCount);
    if (!target) {
        return { brackets: null, capacitySum: 0 };
    }
    const capacitySum = target.reduce((sum, b) => sum + b.capacity, 0);
    if (teamCount <= capacitySum) {
        return { brackets: splitTeams(teamCount, bracketCount), capacitySum };
    }
    const surplus = teamCount - capacitySum;
    if (bracketCount < maxBrackets && surplus >= 2) {
        return {
            brackets: [
                ...target.map((b) => ({ capacity: b.capacity, count: b.capacity })),
                { capacity: powerOfTwoCeil(surplus), count: surplus, extra: true },
            ],
            capacitySum,
        };
    }
    return { brackets: splitTeams(teamCount, bracketCount), capacitySum, noRoomForExtra: true };
}
