import { StatusPillTone } from 'src/app/shared/status-pill/status-pill';

/** A status of the page subject (« En cours », a phase…), shown as a pill. */
export interface AdminHeaderStatus {
  label: string;
  tone: StatusPillTone;
}

/** A piece of information of the page subject (a count, a date, a mode), shown as an info tile. */
export interface AdminHeaderInfo {
  icon: string;
  label: string;
  value: string;
}
