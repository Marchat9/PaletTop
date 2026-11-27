/** Where a "don't ask again" choice applies: a tournament or a training session. */
export type RoundConfirmationScope = 'tournament' | 'training';

/**
 * Codes of the tournaments and training sessions whose admin no longer wants to confirm each new
 * round. Kept in the localStorage cache of the app config, so the choice survives a reload.
 */
export interface SkipRoundConfirmation {
  tournament: string[];
  training: string[];
}

export const NO_SKIPPED_ROUND_CONFIRMATION: SkipRoundConfirmation = {
  tournament: [],
  training: [],
};

/** The stored choices with this tournament or session added (a new object, never a duplicate). */
export function withSkippedRound(
  current: SkipRoundConfirmation,
  scope: RoundConfirmationScope,
  code: string,
): SkipRoundConfirmation {
  if (current[scope].includes(code)) {
    return current;
  }
  return { ...current, [scope]: [...current[scope], code] };
}
