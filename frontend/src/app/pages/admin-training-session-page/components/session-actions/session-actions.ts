import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { Button } from 'src/app/shared/button/button';
import { AnimateOnChangeDirective } from 'src/app/shared/animate-on-change/animate-on-change.directive';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-session-actions',
  imports: [Button, Icon, AnimateOnChangeDirective],
  templateUrl: './session-actions.html',
  styleUrl: './session-actions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionActions {
  public readonly isSessionOpen = input<boolean>(false);
  public readonly canGenerateRound = input<boolean>(false);
  /** Why the next round is unavailable - shown under the bar rather than hidden. */
  public readonly generateBlockedReason = input<Nullable<string>>(null);
  /** The block calls for an action from the admin, not just for waiting. */
  public readonly generateBlockedIsAlert = input<boolean>(false);
  /** What the next round would give, as long as it is not blocked. */
  public readonly nextRoundPreview = input<Nullable<string>>(null);
  public readonly generateLoading = input<boolean>(false);
  public readonly closeLoading = input<boolean>(false);
  /** The group admin also plays and is checked in to this session. */
  public readonly canPlayMyMatches = input<boolean>(false);
  /** No round generated yet, or the admin's match of this round is validated: nothing to play. */
  public readonly playMyMatchesDisabled = input<boolean>(false);

  public readonly openCheckin = output<void>();
  public readonly generateRound = output<void>();
  public readonly closeSession = output<void>();
  public readonly playMyMatches = output<void>();
}
