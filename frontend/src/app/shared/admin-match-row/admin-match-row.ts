import { Dialog } from '@angular/cdk/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Overlay } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { environment } from '@environment';
import { AdminMatchView } from 'src/app/models/admin-match.model';
import { ScoreUpdate } from 'src/app/models/score-update.model';
import { AnimateOnChangeDirective } from 'src/app/shared/animate-on-change/animate-on-change.directive';
import { Icon } from 'src/app/shared/icon/icon';
import { MatchStatusComponent } from 'src/app/shared/match-status/match-status';
import { MatchTimerComponent } from 'src/app/shared/match-timer/match-timer';
import { matchStatusTone } from 'src/app/shared/status-pill/match-status-tone';
import { StatusPill } from 'src/app/shared/status-pill/status-pill';
import { byeLabelOf } from 'src/app/utils/bye-label.util';
import { MatchScoreSheet, MatchScoreSheetData } from './match-score-sheet/match-score-sheet';
import { ScoreStepper } from './score-stepper/score-stepper';

/** Corner dot of a match being played (yellow), awaiting validation (blue) or validated (green). */
const LIVE_DOTS: Partial<Record<string, { modifier: string; label: string }>> = {
  ONGOING: { modifier: 'ongoing', label: 'En cours' },
  ENDED: { modifier: 'ended', label: 'En validation' },
  VALIDATED: { modifier: 'validated', label: 'Validé' },
};

/** Statuses whose score is a result: the winner can be highlighted. */
const RESULT_STATUSES = ['ENDED', 'VALIDATED'];
/** Same limit as the rest of the admin page: below it, corrections open in a bottom sheet. */
const MOBILE_BREAKPOINT = `(max-width: ${environment.limitMobileSizePx}px)`;

/**
 * One match of an admin round (tournament or training), shared by the current round and the rounds
 * history: a compact
 * line to read it; the score is corrected right in the line on desktop, in a bottom sheet on mobile.
 */
@Component({
  selector: 'app-admin-match-row',
  imports: [
    AnimateOnChangeDirective,
    Icon,
    MatchStatusComponent,
    MatchTimerComponent,
    NgTemplateOutlet,
    ScoreStepper,
    StatusPill,
  ],
  templateUrl: './admin-match-row.html',
  styleUrl: './admin-match-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMatchRow {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly breakpointObserver = inject(BreakpointObserver);

  // ======= Input / Output =======
  public readonly match = input.required<AdminMatchView>();
  public readonly pointsPerGame = input.required<number>();
  /** The line can be corrected: current round, or a previous round whose scores stay correctable. */
  public readonly editable = input<boolean>(true);
  /** Desktop correction open in this line (the parent keeps one open at a time). */
  public readonly editing = input<boolean>(false);
  public readonly saving = input<boolean>(false);
  /** Status badge and timer: only meaningful while the round is being played. */
  public readonly showLiveStatus = input<boolean>(true);

  /** Desktop only: asks the parent to open the correction in this line. */
  public readonly editRequested = output<void>();
  public readonly editCancelled = output<void>();
  public readonly scoreSubmitted = output<ScoreUpdate>();
  // ==============================

  // Reset to the saved score each time the correction opens (or the match is updated meanwhile).
  public readonly draftScoreA = linkedSignal({
    source: () => ({ editing: this.editing(), score: this.match().scoreA }),
    computation: ({ score }) => score,
  });
  public readonly draftScoreB = linkedSignal({
    source: () => ({ editing: this.editing(), score: this.match().scoreB }),
    computation: ({ score }) => score,
  });

  private readonly hasResult = computed(() => RESULT_STATUSES.includes(this.match().status));
  public readonly isWinnerA = computed(
    () => this.hasResult() && this.match().scoreA > this.match().scoreB,
  );
  public readonly isWinnerB = computed(
    () => this.hasResult() && this.match().scoreB > this.match().scoreA,
  );
  /** Mobile, where the status badge is hidden: a coloured dot in the corner of the card. */
  public readonly liveDot = computed(() => {
    const dot = LIVE_DOTS[this.match().status];
    return dot ? { className: `live-dot live-dot--${dot.modifier}`, label: dot.label } : null;
  });
  public readonly byeLabel = computed(() => byeLabelOf(this.match()));
  public readonly scoreKey = computed(() => `${this.match().scoreA}-${this.match().scoreB}`);
  public readonly statusTone = computed(() => matchStatusTone(this.match().status));
  public readonly editLabel = computed(
    () => `Modifier le score de la plaque ${this.match().plateNumber ?? ''}`,
  );
  public readonly hasChanges = computed(
    () => this.draftScoreA() !== this.match().scoreA || this.draftScoreB() !== this.match().scoreB,
  );
  /** A changed score, or an ended match the admin validates as it is. */
  public readonly canSave = computed(() => this.hasChanges() || this.match().status === 'ENDED');

  /** Mobile: bottom sheet. Desktop: the line itself turns into the correction. */
  public requestEdit(): void {
    if (!this.editable()) {
      return;
    }
    if (this.breakpointObserver.isMatched(MOBILE_BREAKPOINT)) {
      this.openScoreSheet();
    } else {
      this.editRequested.emit();
    }
  }

  public submit(): void {
    if (!this.canSave() || this.saving()) {
      return;
    }
    this.scoreSubmitted.emit({
      matchId: this.match().id,
      scoreA: this.draftScoreA(),
      scoreB: this.draftScoreB(),
    });
  }

  /** Enter saves from a score field (not from the − / + buttons, which Enter already clicks). */
  public onEditKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.editCancelled.emit();
    } else if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      this.submit();
    }
  }

  private openScoreSheet(): void {
    this.dialog
      .open<ScoreUpdate, MatchScoreSheetData>(MatchScoreSheet, {
        data: { match: this.match(), pointsPerGame: this.pointsPerGame() },
        positionStrategy: this.overlay.position().global().bottom('0').width('100%'),
        panelClass: 'match-score-sheet-panel',
        backdropClass: 'dialog-backdrop-light',
      })
      .closed.subscribe((update) => {
        if (update) {
          this.scoreSubmitted.emit(update);
        }
      });
  }
}
