import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Icon } from 'src/app/shared/icon/icon';
import {
  FillLevel,
  PlanBracket,
  PlanGroup,
  PlanRound,
  TournamentPlan,
} from 'src/app/models/tournament-plan.model';

type CellKind = 'main' | 'consolation' | 'challenge' | 'third_place' | 'empty';

interface PlanTableCell {
  stage: string;
  note: string;
  kind: CellKind;
  done: boolean;
  now: boolean;
}

interface PlanTableColumn {
  label: string;
  done: boolean;
  now: boolean;
}

interface PlanTableRow {
  key: string;
  label: string;
  size: string;
  sub: boolean;
  /** Fill level of the bracket the row belongs to, null for a row without a fill (3rd place). */
  level: FillLevel | null;
  cells: PlanTableCell[];
}

interface PlanTableTotal {
  plates: string;
  done: boolean;
  now: boolean;
}

interface QualifyingSummary {
  rounds: number;
  teams: number;
  matchesPerRound: number;
  hasBye: boolean;
  stopped: number;
}

const CHALLENGE_KEY_PREFIX = 'challenge_';

function powerOfTwoCeil(value: number): number {
  let power = 1;
  while (power < value) power *= 2;
  return power;
}

function plural(count: number, singular: string): string {
  return count > 1 ? `${singular}s` : singular;
}

/**
 * Round by round table of a structured tournament: one row per bracket (with its 3rd place match and
 * challenge as sub-rows), one column per elimination round, and the plates used per round.
 * Round numbers (`doneRounds`, `currentRound`) are those of `PlanRound.number`, qualifying rounds included.
 */
@Component({
  selector: 'app-plan-table',
  imports: [Icon],
  templateUrl: './plan-table.html',
  styleUrl: './plan-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanTable {
  /** A launch option's plan has no options of its own: only the rounds and the brackets are read. */
  public readonly plan = input.required<Omit<TournamentPlan, 'options'>>();
  /** Number of the last finished round: the elimination rounds up to it are shown as done. */
  public readonly doneRounds = input<number>(0);
  /** Number of the round being played, highlighted. */
  public readonly currentRound = input<number | null>(null);
  /** The table always shows at least this many elimination columns (empty ones are padded). */
  public readonly minColumns = input<number>(0);

  protected readonly dragging = signal(false);
  private dragStartX = 0;
  private dragStartScroll = 0;

  protected readonly eliminationRounds = computed<PlanRound[]>(() =>
    this.plan().rounds.filter((round) => round.kind === 'elimination'),
  );

  protected readonly qualifying = computed<QualifyingSummary | null>(() => {
    const plan = this.plan();
    const rounds = plan.rounds.filter((round) => round.kind === 'qualifying');
    const group = rounds[0]?.groups[0];
    if (!group) return null;
    return {
      rounds: rounds.length,
      teams: group.teamCount,
      matchesPerRound: group.matchCount,
      hasBye: group.byeCount > 0,
      stopped: plan.eliminatedAfterQualifying,
    };
  });

  protected readonly columns = computed<PlanTableColumn[]>(() => {
    const rounds = this.eliminationRounds();
    const count = Math.max(rounds.length, this.minColumns());
    return Array.from({ length: count }, (_, index) => {
      const round = rounds.at(index);
      return {
        label: `Élim. ${index + 1}`,
        done: !!round && round.number <= this.doneRounds(),
        now: !!round && round.number === this.currentRound(),
      };
    });
  });

  protected readonly rows = computed<PlanTableRow[]>(() => {
    const plan = this.plan();
    const rounds = this.eliminationRounds();
    const columnCount = this.columns().length;
    const rows: PlanTableRow[] = [];

    const addRow = (
      key: string,
      label: string,
      bracket: PlanBracket | null,
      sub: boolean,
    ): void => {
      const groups = rounds.map((round) => round.groups.find((g) => g.key === key));
      const first = groups.find((g): g is PlanGroup => !!g);
      if (!first) return;
      rows.push({
        key,
        label,
        size: bracket ? this.bracketSize(bracket) : this.groupSize(first),
        sub,
        level: bracket?.fillLevel ?? null,
        cells: this.buildCells(rounds, groups, columnCount),
      });
    };

    plan.brackets.forEach((bracket, index) => {
      addRow(bracket.key, bracket.label, bracket, false);
      if (index === 0) {
        const third = rounds.flatMap((r) => r.groups).find((g) => g.kind === 'third_place');
        if (third) addRow(third.key, '3e place', null, true);
      }
      const challengeKey = `${CHALLENGE_KEY_PREFIX}${bracket.key}`;
      const challenge = rounds.flatMap((r) => r.groups).find((g) => g.key === challengeKey);
      if (challenge) addRow(challengeKey, challenge.label, null, true);
    });
    return rows;
  });

  protected readonly totals = computed<PlanTableTotal[]>(() => {
    const rounds = this.eliminationRounds();
    return this.columns().map((column, index) => {
      const round = rounds.at(index);
      const plates = round?.groups.reduce((sum, group) => sum + group.matchCount, 0) ?? 0;
      return { plates: round ? String(plates) : '', done: column.done, now: column.now };
    });
  });

  protected onMouseDown(event: MouseEvent): void {
    const scroller = event.currentTarget as HTMLElement;
    this.dragging.set(true);
    this.dragStartX = event.clientX;
    this.dragStartScroll = scroller.scrollLeft;
  }

  protected onMouseMove(event: MouseEvent): void {
    if (!this.dragging()) return;
    event.preventDefault();
    const scroller = event.currentTarget as HTMLElement;
    scroller.scrollLeft = this.dragStartScroll + (this.dragStartX - event.clientX);
  }

  protected onMouseUp(): void {
    this.dragging.set(false);
  }

  private buildCells(
    rounds: PlanRound[],
    groups: (PlanGroup | undefined)[],
    columnCount: number,
  ): PlanTableCell[] {
    return Array.from({ length: columnCount }, (_, index) => {
      const round = rounds.at(index);
      const group = groups.at(index);
      const state = {
        done: !!round && round.number <= this.doneRounds(),
        now: !!round && round.number === this.currentRound(),
      };
      if (!group) return { stage: '', note: '', kind: 'empty', ...state };
      return {
        stage: this.stageLabel(group),
        note: this.noteLabel(group),
        kind: this.cellKind(group),
        ...state,
      };
    });
  }

  private cellKind(group: PlanGroup): CellKind {
    if (group.kind === 'main' || group.kind === 'consolation') return group.kind;
    return group.kind === 'third_place' ? 'third_place' : 'challenge';
  }

  private stageLabel(group: PlanGroup): string {
    if (group.kind === 'third_place') return '1 match';
    if (group.teamCount <= 2) return 'Finale';
    if (group.teamCount <= 4) return 'Demies';
    if (group.teamCount <= 8) return 'Quarts';
    return `${group.matchCount} matchs`;
  }

  private noteLabel(group: PlanGroup): string {
    const notes: string[] = [];
    if (group.bestLosersIn > 0) {
      notes.push(`+${group.bestLosersIn} ${plural(group.bestLosersIn, 'repêché')}`);
    }
    if (group.byeCount > 0) notes.push(`${group.byeCount} exempt${group.byeCount > 1 ? 's' : ''}`);
    return notes.join(' · ');
  }

  private bracketSize(bracket: PlanBracket): string {
    return bracket.teamCount === bracket.capacity
      ? String(bracket.capacity)
      : `${bracket.teamCount} / ${bracket.capacity}`;
  }

  private groupSize(group: PlanGroup): string {
    if (group.kind === 'third_place') return '';
    const capacity = powerOfTwoCeil(group.teamCount);
    return group.teamCount === capacity ? String(capacity) : `${group.teamCount} / ${capacity}`;
  }
}
