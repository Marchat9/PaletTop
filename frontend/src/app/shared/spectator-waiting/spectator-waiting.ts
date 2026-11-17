import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { QrCode } from 'src/app/shared/qr-code/qr-code';

/**
 * Spectator screen before the start, tournament or training: how to follow it (QR code and code,
 * desktop only) and who takes part.
 */
@Component({
  selector: 'app-spectator-waiting',
  imports: [QrCode],
  templateUrl: './spectator-waiting.html',
  styleUrl: './spectator-waiting.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpectatorWaiting {
  public readonly code = input<Nullable<string>>(null);
  public readonly url = input<string>('');
  public readonly isMobile = input<boolean>(false);
  /** « Scannez pour suivre le tournoi sur votre téléphone ». */
  public readonly followHint = input.required<string>();
  /** « Équipes inscrites », « Joueurs présents ». */
  public readonly rosterLabel = input.required<string>();
  public readonly names = input<string[]>([]);
  public readonly emptyLabel = input.required<string>();
  /** « Le tournoi va bientôt commencer ». */
  public readonly soonLabel = input.required<string>();
}
