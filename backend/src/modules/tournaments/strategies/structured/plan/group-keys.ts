import { bracketLabel, challengeLabel, THIRD_PLACE_GROUP_KEY } from './structured-plan';

/**
 * TEMPORARY (Task 7): the fixed group names generated before the index-based keys. The adapter in
 * the structured session utils and the data already stored still use them.
 */
export const LEGACY_GROUP_KEY = {
    PRINCIPALE: 'principale',
    THIRD_PLACE_MATCH: 'third_place_match',
    CHALLENGE: 'challenge',
    CONSOLANTE: 'consolante',
    CHALLENGE_CONSOLANTE: 'challenge_consolante',
} as const;

const LEGACY_ORDER: Record<string, number> = {
    [LEGACY_GROUP_KEY.CHALLENGE]: 3,
    [LEGACY_GROUP_KEY.CONSOLANTE]: 4,
    [LEGACY_GROUP_KEY.CHALLENGE_CONSOLANTE]: 5,
};

const LEGACY_LABELS: Record<string, string> = {
    [LEGACY_GROUP_KEY.CHALLENGE]: 'Challenge principale',
    [LEGACY_GROUP_KEY.CONSOLANTE]: 'Consolante',
    [LEGACY_GROUP_KEY.CHALLENGE_CONSOLANTE]: 'Challenge consolante',
};

const CONSOLATION_KEY = /^consolante_(\d+)$/;
const CHALLENGE_CONSOLATION_KEY = /^challenge_consolante_(\d+)$/;

/**
 * Display order of a group key: principale, 3rd place, challenge principale, then each
 * consolation followed by its challenge. Null for a key that is not a bracket group.
 */
export function groupOrderOrNull(key: string): number | null {
    if (key === 'principale') return 1;
    if (key === THIRD_PLACE_GROUP_KEY) return 2;
    if (key === 'challenge_principale') return 3;
    if (key in LEGACY_ORDER) return LEGACY_ORDER[key];
    const consolation = CONSOLATION_KEY.exec(key);
    if (consolation) return 2 * Number(consolation[1]) + 2;
    const challenge = CHALLENGE_CONSOLATION_KEY.exec(key);
    if (challenge) return 2 * Number(challenge[1]) + 3;
    return null;
}

/** Same as `groupOrderOrNull`, unknown keys sorting last. */
export function groupOrder(key: string): number {
    return groupOrderOrNull(key) ?? Number.MAX_SAFE_INTEGER;
}

/** French label of a group key, or null when it is not a bracket group. */
export function groupLabel(key: string): string | null {
    if (key === 'principale') return bracketLabel(0);
    if (key === THIRD_PLACE_GROUP_KEY) return 'Match pour la 3e place';
    if (key === 'challenge_principale') return challengeLabel(0);
    if (key in LEGACY_LABELS) return LEGACY_LABELS[key];
    const consolation = CONSOLATION_KEY.exec(key);
    if (consolation) return bracketLabel(Number(consolation[1]));
    const challenge = CHALLENGE_CONSOLATION_KEY.exec(key);
    if (challenge) return challengeLabel(Number(challenge[1]));
    return null;
}
