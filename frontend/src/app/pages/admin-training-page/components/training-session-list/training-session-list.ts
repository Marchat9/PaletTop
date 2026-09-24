import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Button } from 'src/app/shared/button/button';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';
import { Skeleton } from 'src/app/shared/skeleton/skeleton';
import { StaggerDirective } from 'src/app/shared/stagger/stagger.directive';
import { TrainingSessionSummaryDto } from 'src/app/store/training/training.models';

@Component({
  selector: 'app-training-session-list',
  imports: [Card, Button, Icon, Skeleton, StaggerDirective, DatePipe],
  templateUrl: './training-session-list.html',
  styleUrl: './training-session-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingSessionList {
  public readonly sessions = input<TrainingSessionSummaryDto[]>([]);
  public readonly isLoading = input<boolean>(false);

  public readonly selectSession = output<string>();
  public readonly createSession = output<void>();

  protected readonly hasSessions = computed(() => this.sessions().length > 0);
  // Clé de rejeu de la cascade : la liste change quand une séance est créée ou rechargée.
  protected readonly staggerKey = computed(() =>
    this.sessions()
      .map((session) => session.code)
      .join('-'),
  );
}
