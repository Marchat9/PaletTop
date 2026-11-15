import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import {
  LeaderboardCell,
  LeaderboardColumn,
  LeaderboardRow,
  LeaderboardTable,
  PodiumStep,
} from 'src/app/models/leaderboard.model';
import { Nullable } from 'src/app/models/nullable.model';
import { ScoreCalculation } from 'src/app/models/tournament-configuration-detail.model';
import {
  TrainingClubLeaderboardEntryDto,
  TrainingLeaderboardEntryDto,
} from 'src/app/store/training/training.models';

const PODIUM_PLACES = 3;
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
