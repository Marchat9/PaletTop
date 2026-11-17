import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
} from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { Nullable } from 'src/app/models/nullable.model';
import { AdminPageHeader } from 'src/app/shared/admin-page-header/admin-page-header';
import { AdminHeaderMetric } from 'src/app/shared/admin-page-header/admin-page-header.model';
import { Button } from 'src/app/shared/button/button';
import { ButtonIcon } from 'src/app/shared/button-icon/button-icon';
import { Icon } from 'src/app/shared/icon/icon';
import { AdminTrainingDto } from 'src/app/store/training/training.models';

@Component({
  selector: 'app-training-header',
  imports: [AdminPageHeader, Button, ButtonIcon, Icon, MatMenuModule],
  templateUrl: './training-header.html',
  styleUrl: './training-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingHeader {
  private readonly locale = inject(LOCALE_ID);

  public readonly training = input<Nullable<AdminTrainingDto>>(null);
  public readonly sessionCount = input<number>(0);
  public readonly lastSessionDate = input<Nullable<string>>(null);

  public readonly disconnect = output<void>();
  public readonly edit = output<void>();

  public readonly metrics = computed<AdminHeaderMetric[]>(() => {
    const training = this.training();
    const lastSession = this.lastSessionDate();
    return [
      { label: 'Membres', value: String(training?.members?.length ?? 0) },
      { label: 'Séances', value: String(this.sessionCount()) },
      {
        label: 'Dernière séance',
        value: lastSession ? formatDate(lastSession, 'dd/MM/yyyy', this.locale) : '—',
      },
      {
        label: 'Créé le',
        value: training ? formatDate(training.createdAt, 'dd/MM/yyyy', this.locale) : '—',
      },
    ];
  });
}
