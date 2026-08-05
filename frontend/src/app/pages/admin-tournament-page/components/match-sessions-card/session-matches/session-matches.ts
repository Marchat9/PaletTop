import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  MatchesSessionDto,
  MatchPoolGroup,
  SessionMatchDto,
} from 'src/app/models/matches-session.model';
import { Nullable } from 'src/app/models/nullable.model';
import { ScoreUpdate } from 'src/app/models/score-update.model';
import { Button } from 'src/app/shared/button/button';
import { InputNumber } from 'src/app/shared/input-number/input-number';
import { MatchTimerComponent } from 'src/app/shared/match-timer/match-timer';
import { Icon } from 'src/app/shared/icon/icon';
import { computeMatchGroups } from './session-matches.utils';

@Component({
  selector: 'app-session-matches',
  standalone: true,
  imports: [Button, InputNumber, MatchTimerComponent, Icon],
  templateUrl: './session-matches.html',
  styleUrl: './session-matches.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionMatchesComponent {
  // ======= Input / Output =======
  public readonly session = input.required<MatchesSessionDto>();
  public readonly pointsPerGame = input.required<number>();
  public readonly scoreUpdateLoading = input<boolean>(false);
  public readonly scoreUpdate = output<ScoreUpdate>();
  // ==============================

  public readonly editingMatchId = signal<Nullable<string>>(null);
  public readonly draftScoreA = signal(0);
  public readonly draftScoreB = signal(0);

  public readonly matchGroups = computed<MatchPoolGroup[]>(() =>
    computeMatchGroups(this.session()?.matches ?? []),
  );

  public startEdit(match: SessionMatchDto): void {
    this.draftScoreA.set(match.scoreA);
    this.draftScoreB.set(match.scoreB);
    this.editingMatchId.set(match.id);
  }

  public cancelEdit(): void {
    this.editingMatchId.set(null);
  }

  public saveEdit(matchId: string): void {
    this.scoreUpdate.emit({
      matchId,
      scoreA: this.draftScoreA(),
      scoreB: this.draftScoreB(),
    });
    this.editingMatchId.set(null);
  }
}
