import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-match-timer',
  standalone: true,
  imports: [Icon],
  templateUrl: './match-timer.html',
  styleUrl: './match-timer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchTimerComponent {
  readonly startedAt = input<Nullable<string>>(null);
  readonly finishedAt = input<Nullable<string>>(null);
  readonly status = input.required<string>();

  private readonly elapsed = signal(0);

  readonly display = computed(() => {
    const s = Math.floor(Math.max(0, this.elapsed()));
    return `${Math.floor(s / 60)
      .toString()
      .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  });

  constructor() {
    effect((onCleanup) => {
      const status = this.status();
      const startedAt = this.startedAt();

      if (!startedAt || status === 'PENDING') {
        this.elapsed.set(0);
        return;
      }

      const start = new Date(startedAt).getTime();

      if (status === 'ENDED' || status === 'VALIDATED') {
        const end = this.finishedAt() ? new Date(this.finishedAt()!).getTime() : Date.now();
        this.elapsed.set((end - start) / 1000);
        return;
      }

      if (status === 'ONGOING') {
        const update = () => this.elapsed.set((Date.now() - start) / 1000);
        update();
        const id = setInterval(update, 1000);
        onCleanup(() => clearInterval(id));
      }
    });
  }
}
