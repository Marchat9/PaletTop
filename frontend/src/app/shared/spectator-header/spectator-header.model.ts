import { StatusPillTone } from 'src/app/shared/status-pill/status-pill';

/** A badge of the spectator header: where the event stands, the round in progress… */
export interface SpectatorBadge {
  label: string;
  tone: StatusPillTone;
}
