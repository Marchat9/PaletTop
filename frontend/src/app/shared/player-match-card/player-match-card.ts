import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import {
  PlayerByeCopy,
  PlayerMatchEmptyTone,
  PlayerMatchView,
  PlayerValidationCopy,
} from 'src/app/models/player-match-view.model';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { InputText } from '../input-text/input-text';
import { MatchStatusComponent } from '../match-status/match-status';
import { MatchTimerComponent } from '../match-timer/match-timer';
import { ScoreNumber } from '../score-number/score-number';

const DEFAULT_BYE_COPY: PlayerByeCopy = {
  title: 'Exempté',
  message: 'Vous ne jouez pas ce round.',
};

const DEFAULT_VALIDATION_COPY: PlayerValidationCopy = {
  hint: 'Pour valider le score, demandez son code à votre adversaire.',
  placeholder: 'Code adverse',
};

/**
 * Carte du match en cours côté joueur : démarrage, saisie des deux scores, validation par le
 * code adverse.
 *
 * Partagée entre le tournoi et l'entraînement. Elle ne connaît ni l'un ni l'autre : elle reçoit
 * une `PlayerMatchView` déjà projetée et renvoie des intentions nues, que la page traduit en
 * actions. Sans match, elle garde la boîte et n'accueille que le contenu projeté par la page —
 * les états « pas encore commencé », « terminé » ou « annulé » n'ont pas le même sens des deux
 * côtés.
 */
@Component({
  selector: 'app-player-match-card',
  imports: [Button, ScoreNumber, InputText, MatchTimerComponent, Icon, MatchStatusComponent],
  templateUrl: './player-match-card.html',
  styleUrl: './player-match-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerMatchCard {
  // ======= Input / Output =======
  public readonly match = input<Nullable<PlayerMatchView>>(null);
  public readonly pointsPerGame = input<number>(13);
  public readonly byeCopy = input<PlayerByeCopy>(DEFAULT_BYE_COPY);
  public readonly validationCopy = input<PlayerValidationCopy>(DEFAULT_VALIDATION_COPY);
  /**
   * Épreuve close : démarrer un match et saisir un score ne sont plus acceptés, mais la
   * validation d'un score déjà enregistré reste ouverte — sinon un match terminé juste avant
   * la clôture serait perdu.
   */
  public readonly scoringLocked = input<boolean>(false);
  /**
   * Habillage de la boîte affichée sans match : neutre par défaut, festif pour une fin
   * d'épreuve. La page ne pose pas de classe sur une boîte qu'elle ne rend pas.
   */
  public readonly emptyTone = input<PlayerMatchEmptyTone>('neutral');

  public readonly startError = input<Nullable<string>>(null);
  public readonly scoreError = input<Nullable<string>>(null);
  public readonly validateError = input<Nullable<string>>(null);
  public readonly startLoading = input<boolean>(false);
  public readonly validateLoading = input<boolean>(false);

  public readonly startMatch = output<void>();
  public readonly scoreChange = output<{ myScore: number; opponentScore: number }>();
  public readonly validateMatch = output<string>();
  // ==============================

  // Scores locaux : la saisie doit rester fluide sans attendre l'aller-retour serveur.
  protected readonly localMyScore = signal(0);
  protected readonly localOpponentScore = signal(0);
  protected readonly opponentCode = signal('');

  protected readonly isPending = computed(() => this.match()?.status === 'PENDING');
  protected readonly isValidated = computed(() => this.match()?.status === 'VALIDATED');
  protected readonly isEnded = computed(() => {
    const match = this.match();
    if (!match) {
      return false;
    }
    if (match.status === 'ENDED') {
      return true;
    }
    if (this.isValidated() || this.isPending()) {
      return false;
    }
    // Le score cible atteint localement ouvre la validation sans attendre le serveur.
    const max = this.pointsPerGame();
    return this.localMyScore() >= max || this.localOpponentScore() >= max;
  });

  constructor() {
    effect(() => {
      const match = this.match();
      if (!match) {
        return;
      }
      this.localMyScore.set(match.myScore);
      this.localOpponentScore.set(match.opponentScore);
    });

    // Un nouveau match repart sur un champ de code vide.
    effect(() => {
      this.match()?.id;
      untracked(() => this.opponentCode.set(''));
    });
  }

  protected onMyScoreChange(value: number): void {
    this.localMyScore.set(value);
    this.emitScore();
  }

  protected onOpponentScoreChange(value: number): void {
    this.localOpponentScore.set(value);
    this.emitScore();
  }

  protected onValidate(): void {
    this.validateMatch.emit(this.opponentCode());
  }

  private emitScore(): void {
    this.scoreChange.emit({
      myScore: this.localMyScore(),
      opponentScore: this.localOpponentScore(),
    });
  }
}
