import { StatusPillTone } from './status-pill';

/**
 * Colour of a match status, the same on the admin round list and on the player card: a match must
 * not look "finished" on one screen and "ongoing" on the other.
 */
export function matchStatusTone(status: string): StatusPillTone {
  switch (status) {
    case 'ONGOING':
      return 'ongoing';
    case 'ENDED':
      return 'draft';
    case 'VALIDATED':
      return 'success';
    default:
      return 'pending';
  }
}
