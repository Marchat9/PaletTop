import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PlayerMatchResult } from 'src/app/models/player-match-view.model';
import { MatchStatusComponent } from '../match-status/match-status';

interface PlayerMatchResultRow extends PlayerMatchResult {
  isFinished: boolean;
  isOngoing: boolean;
  statusLabel: string;
  outcomeClass: string;
  outcomeLabel: string;
}

/** History of the player's matches on the tournament or on the session. */
@Component({
  selector: 'app-player-match-history',
  imports: [MatchStatusComponent],
  templateUrl: './player-match-history.html',
  styleUrl: './player-match-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerMatchHistory {
  public readonly results = input<PlayerMatchResult[]>([]);
  public readonly title = input<string>('Derniers matchs');
  public readonly myLabel = input<string>('');
  public readonly emptyMessage = input<string>('Aucun match pour le moment.');

  protected readonly rows = computed<PlayerMatchResultRow[]>(() =>
    this.results().map((result) => {
      const isFinished = result.status === 'ENDED' || result.status === 'VALIDATED';
      const outcomeClass = this.resolveOutcome(result, isFinished);

      return {
        ...result,
        isFinished,
        isOngoing: result.status === 'ONGOING',
        // A validated match stays "finished" for the player: the nuance is of no interest to them.
        statusLabel: result.status === 'VALIDATED' ? 'ENDED' : result.status,
        outcomeClass,
        outcomeLabel: this.outcomeLabels[outcomeClass] ?? '',
      };
    }),
  );

  private readonly outcomeLabels: Record<string, string> = {
    win: 'Victoire',
    loss: 'Défaite',
    draw: 'Nul',
    bye: 'Au repos',
  };

  private resolveOutcome(result: PlayerMatchResult, isFinished: boolean): string {
    if (result.isBye) {
      return 'bye';
    }
    if (!isFinished) {
      return '';
    }
    if (result.myScore > result.opponentScore) {
      return 'win';
    }
    return result.myScore < result.opponentScore ? 'loss' : 'draw';
  }
}
