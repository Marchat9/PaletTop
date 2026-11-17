import { Nullable } from 'src/app/models/nullable.model';
import { StatusPillTone } from 'src/app/shared/status-pill/status-pill';

/** An identifier or a piece of context under the title: a code, a date… */
export interface PlayerHeaderInfo {
  /** « Code tournoi »; none for a self-explanatory value such as a date. */
  label: Nullable<string>;
  value: string;
  icon?: string;
  /** A code the player types: shown large. */
  isCode?: boolean;
}

/** Where the player stands: the phase, the round… */
export interface PlayerHeaderStatus {
  label: string;
  tone: StatusPillTone;
  icon?: string;
}
