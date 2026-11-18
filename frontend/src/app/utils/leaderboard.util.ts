import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import {
  LeaderboardCell,
  LeaderboardColumn,
  LeaderboardItem,
  LeaderboardRow,
  LeaderboardTable,
  PodiumStep,
} from 'src/app/models/leaderboard.model';
import { MATCH_GROUP_LABELS, MatchGroupKey } from 'src/app/models/matches-session.model';
import { RankingSection } from 'src/app/models/global-ranking.model';
import { Nullable } from 'src/app/models/nullable.model';
import { ScoreCalculation } from 'src/app/models/tournament-configuration-detail.model';
import {
  TrainingClubLeaderboardEntryDto,
  TrainingLeaderboardEntryDto,
} from 'src/app/store/training/training.models';

const PODIUM_PLACES = 3;

const POOLS_SECTION_LABEL = 'Éliminés en poules';
/** Visual order of the podium: second on the left, first in the middle, third on the right. */
const PODIUM_ORDER = [2, 1, 3];

/** A row before its rank label is known (it depends on the other rows sharing the rank). */
type UnlabelledRow = Omit<LeaderboardRow, 'rankLabel'>;

/** What a session or club line is ranked on. */
interface WinsAndPoints {
  wins: number;
  points: number;
}

interface TournamentLayout {
  columns: LeaderboardColumn[];
  cells: (entry: GlobalRankingEntry) => LeaderboardCell[];
  summary: (entry: GlobalRankingEntry) => string;
  legend: Nullable<string>;
}

function sectionLabel(section: Nullable<RankingSection>): Nullable<string> {
  if (!section) {
    return null;
  }
  return section === 'pools' ? POOLS_SECTION_LABEL : MATCH_GROUP_LABELS[section as MatchGroupKey];
}

function plain(value: number): LeaderboardCell {
  return { value: String(value), tone: 'neutral' };
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function goalAverage(value: number): LeaderboardCell {
  return {
    value: signed(value),
    tone: value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral',
  };
}

/** « 1= » when several rows share the rank, « 1 » otherwise. */
function withRankLabels(rows: UnlabelledRow[]): LeaderboardRow[] {
  const countByRank = new Map<number, number>();
  for (const entry of rows) {
    countByRank.set(entry.rank, (countByRank.get(entry.rank) ?? 0) + 1);
  }
  return rows.map((entry) => ({
    ...entry,
    rankLabel: (countByRank.get(entry.rank) ?? 0) > 1 ? `${entry.rank}=` : String(entry.rank),
  }));
}

/**
 * Competition ranks of an already sorted list: a row equal to the previous one shares its rank,
 * the next distinct row takes its own position (1, 1, 3).
 */
function competitionRanks<T>(sorted: T[], isTied: (a: T, b: T) => boolean): number[] {
  const ranks: number[] = [];
  sorted.forEach((item, index) => {
    ranks.push(index > 0 && isTied(sorted[index - 1], item) ? ranks[index - 1] : index + 1);
  });
  return ranks;
}

function sameWinsAndPoints(a: WinsAndPoints, b: WinsAndPoints): boolean {
  return a.wins === b.wins && a.points === b.points;
}

function tournamentLayout(scoreCalculation: ScoreCalculation): TournamentLayout {
  switch (scoreCalculation) {
    case 'score':
      return {
        columns: [
          { label: 'Score', title: 'Somme des scores' },
          { label: 'GA', title: 'Goal average' },
        ],
        cells: (entry) => [plain(entry.pointsFor), goalAverage(entry.goalAverage)],
        summary: (entry) => `${entry.pointsFor} · ${signed(entry.goalAverage)}`,
        legend: 'Score = somme des scores · GA = Goal average',
      };
    case 'victory_buchholz_ga':
      return {
        columns: [
          { label: 'V', title: 'Victoires' },
          { label: 'Bch.', title: 'Score Buchholz (Somme des victoires des adversaires)' },
          { label: 'GA', title: 'Goal average' },
        ],
        cells: (entry) => [
          plain(entry.wins),
          plain(entry.buchholz),
          goalAverage(entry.goalAverage),
        ],
        summary: (entry) =>
          `${entry.wins} V · ${entry.buchholz} Bch. · ${signed(entry.goalAverage)}`,
        legend:
          'V = victoires · Bch. = Score Buchholz (Somme des victoires des adversaires) · GA = Goal average',
      };
    case 'score_buchholz_ga':
      return {
        columns: [
          { label: 'Score', title: 'Somme des scores' },
          { label: 'Bch.', title: 'Score Buchholz (Somme des victoires des adversaires)' },
          { label: 'GA', title: 'Goal average' },
        ],
        cells: (entry) => [
          plain(entry.pointsFor),
          plain(entry.buchholz),
          goalAverage(entry.goalAverage),
        ],
        summary: (entry) =>
          `${entry.pointsFor} · ${entry.buchholz} Bch. · ${signed(entry.goalAverage)}`,
        legend:
          'Score = somme des scores · Bch. = Score Buchholz (Somme des victoires des adversaires) · GA = Goal average',
      };
    case 'tournament_score':
      return {
        columns: [{ label: 'Pts Tournoi', title: 'Points tournoi' }],
        cells: (entry) => [plain(entry.tournamentPoints)],
        summary: (entry) => `${entry.tournamentPoints} pts`,
        legend: null,
      };
    default:
      return {
        columns: [
          { label: 'V', title: 'Victoires' },
          { label: 'Pts+', title: 'Points marqués' },
          { label: 'GA', title: 'Goal average' },
        ],
        cells: (entry) => [
          plain(entry.wins),
          plain(entry.pointsFor),
          goalAverage(entry.goalAverage),
        ],
        summary: (entry) => `${entry.wins} V · ${entry.pointsFor} · ${signed(entry.goalAverage)}`,
        legend: 'V = victoires · Pts+ = points marqués · GA = Goal average',
      };
  }
}

/** Tournament ranking: the server already ranks the teams, ties included. */
export function toTournamentLeaderboard(
  ranking: GlobalRankingEntry[],
  scoreCalculation: ScoreCalculation,
): LeaderboardTable {
  const layout = tournamentLayout(scoreCalculation);
  return {
    nameLabel: 'Équipe',
    columns: layout.columns,
    legend: layout.legend,
    rows: withRankLabels(
      ranking.map((entry) => ({
        id: entry.teamId,
        rank: entry.rank,
        name: entry.teamName,
        cells: layout.cells(entry),
        summary: layout.summary(entry),
        section: sectionLabel(entry.section),
      })),
    ),
  };
}

/** Session leaderboard: sorted by the server (wins, then points), ranked here with ties. */
export function toSessionLeaderboard(entries: TrainingLeaderboardEntryDto[]): LeaderboardTable {
  const ranks = competitionRanks(entries, sameWinsAndPoints);
  return {
    nameLabel: 'Joueur',
    columns: [
      { label: 'V', title: 'Victoires' },
      { label: 'Pts', title: 'Points' },
    ],
    legend: null,
    rows: withRankLabels(
      entries.map((entry, index) => ({
        id: entry.participantId,
        rank: ranks[index],
        name: entry.name,
        cells: [plain(entry.wins), plain(entry.points)],
        summary: `${entry.wins} V · ${entry.points} pts`,
        section: null,
      })),
    ),
  };
}

/** Club leaderboard: every session of the club added up, sorted by the server like a session. */
export function toClubLeaderboard(entries: TrainingClubLeaderboardEntryDto[]): LeaderboardTable {
  const ranks = competitionRanks(entries, sameWinsAndPoints);
  return {
    nameLabel: 'Membre',
    columns: [
      { label: 'Séances', title: 'Séances jouées' },
      { label: 'V', title: 'Victoires' },
      { label: 'Pts', title: 'Points' },
    ],
    legend: null,
    rows: withRankLabels(
      entries.map((entry, index) => ({
        id: entry.memberId,
        rank: ranks[index],
        name: entry.name,
        cells: [plain(entry.sessionsPlayed), plain(entry.wins), plain(entry.points)],
        summary: `${entry.points} pts`,
        section: null,
      })),
    ),
  };
}

/**
 * Steps of the podium, in visual order (2, 1, 3). Tied rows stand on the same step, and the places
 * they take are skipped: two first ex aequo leave no second step.
 */
export function podiumSteps(rows: LeaderboardRow[]): PodiumStep[] {
  const steps = new Map<number, PodiumStep>();
  for (const entry of rows.filter((candidate) => candidate.rank <= PODIUM_PLACES)) {
    const step = steps.get(entry.rank);
    if (step) {
      step.ids.push(entry.id);
      step.names.push(entry.name);
    } else {
      steps.set(entry.rank, {
        rank: entry.rank,
        rankLabel: entry.rankLabel,
        place: entry.rank,
        ids: [entry.id],
        names: [entry.name],
        summary: entry.summary,
      });
    }
  }
  return PODIUM_ORDER.flatMap((place) => steps.get(place) ?? []);
}

/** Rows not standing on the podium. */
export function rowsBelowPodium(rows: LeaderboardRow[]): LeaderboardRow[] {
  return rows.filter((entry) => entry.rank > PODIUM_PLACES);
}

/**
 * What the tables list: the rows (those below the podium when it is shown), with a heading before
 * each new section. The automatic pagination counts these items.
 */
export function leaderboardItems(rows: LeaderboardRow[], showPodium: boolean): LeaderboardItem[] {
  const listed = showPodium ? rowsBelowPodium(rows) : rows;
  const items: LeaderboardItem[] = [];
  let current: Nullable<string> = null;
  listed.forEach((row, index) => {
    if (row.section && row.section !== current) {
      items.push({ kind: 'section', key: `section-${index}`, label: row.section });
    }
    current = row.section;
    items.push({ kind: 'row', key: row.id, row });
  });
  return items;
}

/**
 * The window of items shown (all of them without a size), cut into one or two tables. A table
 * starting in the middle of a section repeats its heading, so every line says where it stands.
 */
export function itemTables(
  items: LeaderboardItem[],
  start: number,
  size: Nullable<number>,
  columns: 1 | 2,
): LeaderboardItem[][] {
  const window = size ? items.slice(start, start + size) : items;
  if (window.length === 0) {
    return [];
  }
  const chunks =
    columns === 2 && window.length > 1
      ? [window.slice(0, Math.ceil(window.length / 2)), window.slice(Math.ceil(window.length / 2))]
      : [window];
  return chunks.map((chunk) => {
    const first = chunk[0];
    if (first.kind === 'row' && first.row.section) {
      return [
        { kind: 'section', key: `continued-${first.key}`, label: first.row.section },
        ...chunk,
      ];
    }
    return chunk;
  });
}

/** « Rangs 4 – 15 »: what a page of a paginated leaderboard shows; null on an empty page. */
export function pageRankLabel(
  items: LeaderboardItem[],
  start: number,
  size: number,
): Nullable<string> {
  const rows = items
    .slice(start, start + size)
    .flatMap((item) => (item.kind === 'row' ? [item.row] : []));
  if (rows.length === 0) {
    return null;
  }
  return `Rangs ${rows[0].rank} – ${rows[rows.length - 1].rank}`;
}
