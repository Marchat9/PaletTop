import { StatusPillTone } from 'src/app/shared/status-pill/status-pill';

/** A status of the page subject (« En cours », a phase…), shown as a pill. */
export interface AdminHeaderStatus {
  label: string;
  tone: StatusPillTone;
}

/** A key figure of the page subject, shown as a metric tile. */
export interface AdminHeaderMetric {
  label: string;
  value: string;
}
