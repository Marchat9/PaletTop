import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FillLevel, PlanBracket } from 'src/app/models/tournament-plan.model';

interface BracketChip {
  key: string;
  name: string;
  count: number;
  /** « / 32 » for a partial bracket, empty for a full one. */
  capacityText: string;
  /** Width of the bar, in percent. */
  percent: number;
  level: FillLevel;
  detail: string;
  main: boolean;
}

/** One card per bracket of the split: teams / capacity, fill bar and best losers brought back. */
@Component({
  selector: 'app-bracket-chips',
  templateUrl: './bracket-chips.html',
  styleUrl: './bracket-chips.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BracketChips {
  public readonly brackets = input.required<PlanBracket[]>();
  /** Number of cards to reach: the missing ones are drawn as dashed placeholders. */
  public readonly slots = input<number>(0);
  /** Smaller cards, for a narrow space. */
  public readonly dense = input<boolean>(false);

  protected readonly chips = computed<BracketChip[]>(() =>
    this.brackets().map((bracket, index) => {
      const full = bracket.teamCount === bracket.capacity;
      const best = bracket.bestLosersFirstRound;
      return {
        key: bracket.key,
        name: bracket.extra ? `${bracket.label} (en plus)` : bracket.label,
        count: bracket.teamCount,
        capacityText: full ? '' : ` / ${bracket.capacity}`,
        percent: Math.round(bracket.fillRatio * 100),
        level: bracket.fillLevel,
        detail: full
          ? 'Complet'
          : best > 0
            ? `+${best} ${best > 1 ? 'meilleurs perdants' : 'meilleur perdant'}`
            : '',
        main: index === 0,
      };
    }),
  );

  protected readonly placeholders = computed<number[]>(() =>
    Array.from({ length: Math.max(0, this.slots() - this.brackets().length) }, (_, index) => index),
  );
}
