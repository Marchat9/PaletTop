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
  /** Pourquoi le round suivant est indisponible — affiché sous la barre plutôt que masqué. */
  public readonly generateBlockedReason = input<Nullable<string>>(null);
  /** Le blocage demande une action de l’administrateur, pas seulement d’attendre. */
  public readonly generateBlockedIsAlert = input<boolean>(false);
  /** Ce que donnerait le prochain round, tant qu'il n'est pas bloqué. */
  public readonly nextRoundPreview = input<Nullable<string>>(null);
  public readonly generateLoading = input<boolean>(false);
  public readonly closeLoading = input<boolean>(false);

  public readonly openCheckin = output<void>();
  public readonly generateRound = output<void>();
  public readonly closeSession = output<void>();
}
