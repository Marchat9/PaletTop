/** Group key of the 3rd place match (same value as the backend). */
export const THIRD_PLACE_GROUP_KEY = 'third_place_match';

const CONSOLATION_KEY = /^consolante_(\d+)$/;
const CHALLENGE_CONSOLATION_KEY = /^challenge_consolante_(\d+)$/;

/**
 * Display order of a bracket group key, as the backend orders it (`groupOrder`): principale, 3rd
 * place, challenge principale, then each consolation followed by its challenge. Unknown keys last.
 */
export function groupOrder(key: string): number {
  if (key === 'principale') return 1;
  if (key === THIRD_PLACE_GROUP_KEY) return 2;
  if (key === 'challenge_principale') return 3;
  const consolation = CONSOLATION_KEY.exec(key);
  if (consolation) return 2 * Number(consolation[1]) + 2;
  const challenge = CHALLENGE_CONSOLATION_KEY.exec(key);
  if (challenge) return 2 * Number(challenge[1]) + 3;
  return Number.MAX_SAFE_INTEGER;
}
