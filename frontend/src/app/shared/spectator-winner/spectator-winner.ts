import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The winner of a finished tournament, or the best player of a closed session. */
@Component({
  selector: 'app-spectator-winner',
  templateUrl: './spectator-winner.html',
  styleUrl: './spectator-winner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpectatorWinner {
  /** « Vainqueur », « Meilleur joueur de la séance ». */
  public readonly label = input.required<string>();
  public readonly name = input.required<string>();
  public readonly summary = input<string>('');
}
