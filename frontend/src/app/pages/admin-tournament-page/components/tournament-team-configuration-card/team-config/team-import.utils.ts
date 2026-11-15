import { environment } from '@environment';
import { Nullable } from '../../../../../models/nullable.model';
import { TeamConfigCreateTeamPayload } from '../../../../../models/team-config.model';
import { TournamentStatus } from '../../../../../models/tournament-status.enum';
import { TournamentDto } from '../../../../../store/tournament/tournament.models';
import { ParsedTeamRow } from './team-excel.utils';

export type ImportRowStatus = 'ready' | 'warning' | 'ignored';
export type ImportRowFilter = 'all' | ImportRowStatus;

export interface ImportRowView {
  row: ParsedTeamRow;
  status: ImportRowStatus;
  displayName: string;
}

export interface ImportRowCounts {
  all: number;
  ready: number;
  warning: number;
  ignored: number;
  importable: number;
}

export interface ImportCapacity {
  existing: number;
  importable: number;
  max: number;
  after: number;
  remaining: number;
  exceeds: boolean;
}

const STATUS_ORDER: Record<ImportRowStatus, number> = { ignored: 0, warning: 1, ready: 2 };

function statusOf(row: ParsedTeamRow): ImportRowStatus {
  if (row.errors.length > 0) {
    return 'ignored';
  }
  return row.warnings.length > 0 ? 'warning' : 'ready';
}

export function classifyImportRows(
  rows: ParsedTeamRow[],
  existingTeamCount: number,
): ImportRowView[] {
  // Auto names are numbered over importable rows only, in file order.
  let importableSeen = 0;
  const views = rows.map((row): ImportRowView => {
    const status = statusOf(row);
    let displayName: string;
    if (row.name) {
      displayName = row.name;
    } else if (status === 'ignored') {
      displayName = `Ligne ${row.rowIndex}`;
    } else {
      displayName = `Équipe ${existingTeamCount + importableSeen + 1}`;
    }
    if (status !== 'ignored') {
      importableSeen++;
    }
    return { row, status, displayName };
  });

  return views.sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.row.rowIndex - b.row.rowIndex,
  );
}

export function filterImportRows(views: ImportRowView[], filter: ImportRowFilter): ImportRowView[] {
  return filter === 'all' ? views : views.filter((view) => view.status === filter);
}

export function countImportRows(views: ImportRowView[]): ImportRowCounts {
  const ready = views.filter((v) => v.status === 'ready').length;
  const warning = views.filter((v) => v.status === 'warning').length;
  const ignored = views.filter((v) => v.status === 'ignored').length;
  return { all: views.length, ready, warning, ignored, importable: ready + warning };
}

export function toImportPayload(rows: ParsedTeamRow[]): TeamConfigCreateTeamPayload[] {
  return rows
    .filter((row) => row.errors.length === 0)
    .map((row) => ({ name: row.name, players: row.players }));
}

export function computeImportCapacity(
  existing: number,
  importable: number,
  max: number,
): ImportCapacity {
  const effectiveMax = max > 0 ? max : environment.tournamentConfiguration.maxTeamCapacity.max;
  const after = existing + importable;
  return {
    existing,
    importable,
    max: effectiveMax,
    after,
    remaining: Math.max(0, effectiveMax - existing),
    exceeds: after > effectiveMax,
  };
}

const plural = (count: number, singular: string, pluralForm: string): string =>
  `${count} ${count > 1 ? pluralForm : singular}`;

export function buildImportBlockReason(
  counts: ImportRowCounts,
  capacity: ImportCapacity,
): Nullable<string> {
  if (counts.importable === 0) {
    return 'Aucune équipe à importer.';
  }
  if (capacity.exceeds) {
    const toImport = plural(counts.importable, 'équipe à importer', 'équipes à importer');
    const places = plural(capacity.remaining, 'place restante', 'places restantes');
    return `${toImport}, ${places} (${capacity.existing} / ${capacity.max}).`;
  }
  return null;
}

export function pickImportFile(files: ArrayLike<File>, acceptedExtensions: string): Nullable<File> {
  const extensions = acceptedExtensions
    .split(',')
    .map((ext) => ext.trim().toLowerCase())
    .filter(Boolean);
  return (
    Array.from(files).find((file) =>
      extensions.some((ext) => file.name.toLowerCase().endsWith(ext)),
    ) ?? null
  );
}

/**
 * Excel import is offered only while teams can still be added: draft tournament, outside
 * championships, with room left (same capacity fallback as the creation form).
 */
export function canImportTeams(tournament: Nullable<TournamentDto>): boolean {
  if (!tournament) {
    return false;
  }
  const capacity =
    tournament.configuration.maxTeamCapacity ??
    environment.tournamentConfiguration.maxTeamCapacity.max;
  return (
    tournament.status === TournamentStatus.DRAFT &&
    tournament.configuration.competitionMode !== 'championship' &&
    (tournament.teams?.length ?? 0) < capacity
  );
}
