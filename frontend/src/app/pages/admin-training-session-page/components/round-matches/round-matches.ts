import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AnimateOnChangeDirective } from 'src/app/shared/animate-on-change/animate-on-change.directive';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { InputNumber } from 'src/app/shared/input-number/input-number';
import { MatchStatusComponent } from 'src/app/shared/match-status/match-status';
import { MatchTimerComponent } from 'src/app/shared/match-timer/match-timer';
import { StaggerDirective } from 'src/app/shared/stagger/stagger.directive';
import { StatusPill, StatusPillTone } from 'src/app/shared/status-pill/status-pill';
import {
  TrainingMatchDto,
  TrainingMatchStatus,
  TrainingRoundDto,
  TrainingTeamDto,
} from 'src/app/store/training/training.models';
import { TrainingScoreUpdate } from '../../admin-training-session-page.models';

@Component({
  selector: 'app-round-matches',
  imports: [
    Button,
    Icon,
    InputNumber,
    MatchStatusComponent,
    MatchTimerComponent,
    StaggerDirective,
    AnimateOnChangeDirective,
    StatusPill,
  ],
  templateUrl: './round-matches.html',
  styleUrl: './round-matches.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoundMatches {
  public readonly round = input.required<TrainingRoundDto>();
  public readonly pointsPerGame = input<number>(13);
  /** Seule une séance ouverte autorise la correction de score. */
  public readonly editable = input<boolean>(true);
  public readonly scoreLoading = input<boolean>(false);

  public readonly updateScore = output<TrainingScoreUpdate>();

  /**
   * « En validation » attend encore une action de la part des joueurs : il porte donc le ton
   * d'un brouillon, pas celui d'un match abouti.
   */
  protected statusTone(status: TrainingMatchStatus): StatusPillTone {
    switch (status) {
      case 'ONGOING':
        return 'ongoing';
      case 'ENDED':
        return 'draft';
      case 'VALIDATED':
        return 'success';
      default:
        return 'pending';
    }
  }

  protected readonly editingMatchId = signal<string | null>(null);
  protected readonly draftScoreA = signal(0);
  protected readonly draftScoreB = signal(0);

  // Les exemptés n'occupent pas de planche : on numérote sans eux, sinon les numéros
  // sauteraient dès qu'un joueur est au repos au milieu du round.
  protected readonly matchRows = computed(() => {
    let plateNumber = 0;
    return this.round().matches.map((match) => ({
      match,
      plateNumber: match.isBye ? null : ++plateNumber,
    }));
  });

  protected teamLabel(team: TrainingTeamDto | null): string {
    if (!team) {
      return '—';
    }
    if (team.name) {
      return team.name;
    }
    return team.members.map((member) => member.name).join(' · ');
  }

  protected startEdit(match: TrainingMatchDto): void {
    this.editingMatchId.set(match.id);
    this.draftScoreA.set(match.scoreA);
    this.draftScoreB.set(match.scoreB);
  }

  protected cancelEdit(): void {
    this.editingMatchId.set(null);
  }

  protected saveEdit(matchId: string): void {
    this.updateScore.emit({
      matchId,
      scoreA: this.draftScoreA(),
      scoreB: this.draftScoreB(),
    });
    this.editingMatchId.set(null);
  }
}
