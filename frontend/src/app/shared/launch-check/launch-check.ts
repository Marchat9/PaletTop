import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import {
  FillLevel,
  PlanBracket,
  PlanOption,
  PlanOptionId,
  TournamentPlan,
} from 'src/app/models/tournament-plan.model';
import { BracketChips } from 'src/app/shared/bracket-chips/bracket-chips';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { InlineNotice, InlineNoticeTone } from 'src/app/shared/inline-notice/inline-notice';
import { PlanTable } from 'src/app/shared/plan-table/plan-table';
import { StatusPill, StatusPillTone } from 'src/app/shared/status-pill/status-pill';
import { Switch } from 'src/app/shared/switch/switch';
import { hasLowFill, isPlanPossible, worstFillLevel } from 'src/app/utils/launch-check.util';
import { ALL_BRACKETS_FILLED_MESSAGE } from 'src/app/utils/plan-message.util';

interface FillBadge {
  tone: StatusPillTone;
  label: string;
}

const FILL_BADGES: Record<FillLevel, FillBadge> = {
  ok: { tone: 'success', label: 'Complet ou presque' },
  mid: { tone: 'draft', label: 'Quelques repêchés' },
  low: { tone: 'error', label: 'Beaucoup de repêchés' },
};
/** An option without any bracket: it cannot be launched. */
const IMPOSSIBLE_BADGE: FillBadge = { tone: 'error', label: 'Impossible' };

function removedLabelOf(count: number): Nullable<string> {
  if (count <= 0) {
    return null;
  }
  return `${count} ${count > 1 ? 'équipes retirées' : 'équipe retirée'} entre qualification et élimination`;
}

interface OptionCard {
  id: PlanOptionId;
  label: string;
  description: string;
  recommended: boolean;
  brackets: PlanBracket[];
  fill: FillBadge;
  /** Badge of the teams removed between the qualifiers and the elimination; null when none. */
  removedLabel: Nullable<string>;
  /** Short form of the badge: the full sentence is its tooltip. */
  removedShort: Nullable<string>;
  selected: boolean;
}

interface OptionNotice {
  tone: InlineNoticeTone;
  icon: Nullable<string>;
  text: string;
}

/**
 * The choices offered when the registered teams differ from the planned count: one card per
 * option (brackets, fill, « Voir le parcours » on a narrow screen), the table and the warnings of
 * the selected one, and the extra confirmation a nearly empty bracket asks for.
 */
@Component({
  selector: 'app-launch-check',
  imports: [BracketChips, Button, Icon, InlineNotice, PlanTable, StatusPill, Switch],
  templateUrl: './launch-check.html',
  styleUrl: './launch-check.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaunchCheck {
  public readonly plan = input.required<TournamentPlan>();
  public readonly registeredCount = input.required<number>();
  public readonly targetCount = input.required<number>();
  public readonly selectedOptionId = input<Nullable<PlanOptionId>>(null);
  /** Whether the admin accepts to start with a nearly empty bracket. */
  public readonly lowFillConfirmed = input<boolean>(false);
  /** Narrow screen: the table of an option opens apart, from its card. */
  public readonly mobile = input<boolean>(false);

  public readonly select = output<PlanOptionId>();
  public readonly view = output<PlanOptionId>();
  public readonly lowFillConfirmedChange = output<boolean>();
  /** The admin wants to set the brackets by hand, in the tournament configuration. */
  public readonly editConfiguration = output<void>();

  protected readonly registeredLabel = computed(
    () => `${this.registeredCount()} équipes inscrites`,
  );
  protected readonly comparison = computed(() => {
    const target = this.targetCount();
    const gap = this.registeredCount() - target;
    return gap < 0
      ? `au lieu des ${target} visées.`
      : `soit ${gap} de plus que les ${target} visées.`;
  });

  protected readonly selectedOption = computed<Nullable<PlanOption>>(
    () => this.plan().options.find((option) => option.id === this.selectedOptionId()) ?? null,
  );

  protected readonly cards = computed<OptionCard[]>(() =>
    this.plan().options.map((option) => ({
      id: option.id,
      label: option.label,
      description: option.description,
      recommended: option.recommended,
      brackets: option.plan.brackets,
      fill: isPlanPossible(option.plan)
        ? FILL_BADGES[worstFillLevel(option.plan)]
        : IMPOSSIBLE_BADGE,
      removedLabel: removedLabelOf(option.eliminatedAfterQualifying),
      removedShort:
        option.eliminatedAfterQualifying > 0
          ? `${option.eliminatedAfterQualifying} ${option.eliminatedAfterQualifying > 1 ? 'retirées' : 'retirée'}`
          : null,
      selected: option.id === this.selectedOptionId(),
    })),
  );

  protected readonly notices = computed<OptionNotice[]>(() => {
    const warnings = this.selectedOption()?.plan.warnings ?? [];
    if (!warnings.length) {
      return [{ tone: 'info', icon: 'check_circle', text: ALL_BRACKETS_FILLED_MESSAGE }];
    }
    return warnings.map((warning) => ({
      tone: warning.level === 'info' ? 'info' : 'alert',
      icon: null,
      text: warning.message,
    }));
  });

  protected readonly needsConfirmation = computed(() => {
    const option = this.selectedOption();
    return !!option && hasLowFill(option.plan);
  });
}
