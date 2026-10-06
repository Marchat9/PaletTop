import { DatePipe } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { StatusPill, StatusPillTone } from 'src/app/shared/status-pill/status-pill';
import {
  clearSuperAdminTrainingDetail,
  loadSuperAdminTrainingDetail,
} from 'src/app/store/superadmin-trainings/superadmin-trainings.actions';
import { selectSuperAdminTrainingDetail } from 'src/app/store/superadmin-trainings/superadmin-trainings.selectors';
import { TrainingSessionStatus } from 'src/app/store/training/training.models';
import { Button } from '../../shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';

export interface SuperAdminTrainingDetailData {
  id: string;
}

const SESSION_STATUS_LABELS: Record<TrainingSessionStatus, string> = {
  OPEN: 'Ouverte',
  CLOSED: 'Clôturée',
};

// Same colours as the training admin page: green when open, grey-blue when closed.
const SESSION_STATUS_TONES: Record<TrainingSessionStatus, StatusPillTone> = {
  OPEN: 'ongoing',
  CLOSED: 'pending',
};

@Component({
  selector: 'app-super-admin-training-detail-popup',
  imports: [Button, Icon, DatePipe, StatusPill],
  templateUrl: './super-admin-training-detail-popup.html',
  styleUrl: './super-admin-training-detail-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminTrainingDetailPopupComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  readonly dialogRef = inject(DialogRef<void>);
  readonly data = inject<SuperAdminTrainingDetailData>(DIALOG_DATA);

  readonly detail = this.store.selectSignal(selectSuperAdminTrainingDetail);
  readonly sessionStatusLabels = SESSION_STATUS_LABELS;
  readonly sessionStatusTones = SESSION_STATUS_TONES;

  ngOnInit(): void {
    this.store.dispatch(loadSuperAdminTrainingDetail({ id: this.data.id }));
  }

  ngOnDestroy(): void {
    this.store.dispatch(clearSuperAdminTrainingDetail());
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
