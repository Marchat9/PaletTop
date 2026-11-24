import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { PlanBracket, TournamentPlan } from 'src/app/models/tournament-plan.model';
import { pickPlanMessage } from 'src/app/utils/plan-message.util';
import { BracketChips } from '../bracket-chips/bracket-chips';
import { Button } from '../button/button';
import { InlineNotice } from '../inline-notice/inline-notice';

/** Cards reserved in the panel, so that adding a consolation does not move what is below. */
const RESERVED_CHIP_SLOTS = 4;

const FIRST_LETTER_CODE = 65;

/**
 * The brackets of a structured tournament: chips of the preview, the buttons to add or remove the
 * last consolation, the comfort range and one prioritised message.
 */
@Component({
  selector: 'app-bracket-panel',
  imports: [BracketChips, Button, InlineNotice],
  templateUrl: './bracket-panel.html',
  styleUrl: './bracket-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BracketPanel {
  public readonly plan = input.required<TournamentPlan | null>();
  public readonly consolationCount = input.required<number>();
  /** Highest consolation count (app setting). */
  public readonly maxConsolations = input.required<number>();
  /** Teams registered on a tournament being edited; null while creating. */
  public readonly registeredCount = input<Nullable<number>>(null);
  /** « Nombre d'équipes cible ». */
  public readonly targetCount = input<Nullable<number>>(null);

  public readonly addConsolation = output<void>();
  public readonly removeConsolation = output<void>();

  protected readonly reservedSlots = RESERVED_CHIP_SLOTS;

  protected readonly brackets = computed<PlanBracket[]>(() => this.plan()?.brackets ?? []);
  protected readonly comfortText = computed(() => this.plan()?.comfort?.text ?? '');
  protected readonly message = computed(() => pickPlanMessage(this.plan()));

  protected readonly canAdd = computed(() => this.consolationCount() < this.maxConsolations());
  protected readonly canRemove = computed(() => this.consolationCount() > 0);

  protected readonly addLabel = computed(
    () => `Ajouter la consolante ${letterOf(this.consolationCount())}`,
  );
  protected readonly removeLabel = computed(() =>
    this.canRemove()
      ? `Supprimer la consolante ${letterOf(this.consolationCount() - 1)}`
      : 'Supprimer la consolante',
  );

  protected readonly registeredText = computed(() => {
    const registered = this.registeredCount();
    if (registered === null || registered === undefined) {
      return '';
    }
    const noun = registered > 1 ? 'inscrites' : 'inscrite';
    return `${registered} ${noun} / cible ${this.targetCount() ?? '-'}`;
  });
}

/** « Consolante A » is the first one: index 0. */
function letterOf(index: number): string {
  return String.fromCharCode(FIRST_LETTER_CODE + index);
}
