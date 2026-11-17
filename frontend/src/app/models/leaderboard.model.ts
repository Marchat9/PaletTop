import { Nullable } from './nullable.model';

/** Colour of a value: a goal average is good when positive and bad when negative. */
export type LeaderboardTone = 'neutral' | 'positive' | 'negative';

/** A statistics column of the leaderboard (the rank and name columns are always there). */
export interface LeaderboardColumn {
  /** Short header shown in the table (« V », « Pts+ »...). */
  label: string;
  /** Full name, read by screen readers and shown on hover. */
  title: string;
}

export interface LeaderboardCell {
  value: string;
  tone: LeaderboardTone;
}

/** One line of a leaderboard, whatever it ranks: tournament team, session player, club member. */
export interface LeaderboardRow {
  id: string;
  /** Competition rank: tied rows share it and the next one skips (1, 1, 3). */
  rank: number;
  /** Rank as displayed: « 1= » when shared. */
  rankLabel: string;
  name: string;
  /** One cell per column, in the order of the columns. */
  cells: LeaderboardCell[];
  /** The same statistics on a single line, for the podium (« 3 V · 39 · +21 »). */
  summary: string;
  /** Section the row belongs to (« Consolante »...); null when the ranking has none. */
  section: Nullable<string>;
}

/** What a leaderboard table lists: its rows, with a heading before each new section. */
export type LeaderboardItem =
  | { kind: 'section'; key: string; label: string }
  | { kind: 'row'; key: string; row: LeaderboardRow };

/** Everything a leaderboard displays, built from one of the ranking sources. */
export interface LeaderboardTable {
  /** Header of the name column (« Équipe », « Joueur », « Membre »). */
  nameLabel: string;
  columns: LeaderboardColumn[];
  rows: LeaderboardRow[];
  /** Explains the abbreviations under the table, when there are any. */
  legend: Nullable<string>;
}

/** One step of the podium: everyone tied at this rank stands on it. */
export interface PodiumStep {
  rank: number;
  rankLabel: string;
  /** 1, 2 or 3: the medal and the height of the step. */
  place: number;
  ids: string[];
  names: string[];
  summary: string;
}
