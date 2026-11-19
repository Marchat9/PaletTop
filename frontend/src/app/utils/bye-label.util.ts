/** What tells a bye apart: a tournament exempt worth a win, or a training player resting. */
export interface ByeKind {
  /** A bye worth one win (tournaments). */
  byeWin?: boolean;
  /** A training player resting this round: worth nothing. */
  isRest?: boolean;
}

/** Label of a bye, the same on the admin rows and the spectator tiles. */
export function byeLabelOf(match: ByeKind): string {
  if (match.isRest) {
    return 'Au repos ce round';
  }
  return match.byeWin ? 'Exempté (victoire)' : 'Exempté';
}
