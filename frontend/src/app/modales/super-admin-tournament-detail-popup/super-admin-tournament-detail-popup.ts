import { DatePipe } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import {
  clearSuperAdminTournamentDetail,
  loadSuperAdminTournamentDetail,
} from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';
import { selectSuperAdminTournamentDetail } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.selectors';
import { Button } from '../../shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';

export interface SuperAdminTournamentDetailData {
  id: string;
}

const STATUS_LABELS: Record<TournamentStatus, string> = {
  [TournamentStatus.DRAFT]: 'Brouillon',
  [TournamentStatus.ACTIVE]: 'Actif',
  [TournamentStatus.FINISHED]: 'Terminé',
  [TournamentStatus.CANCELLED]: 'Annulé',
};

@Component({
  selector: 'app-super-admin-tournament-detail-popup',
  imports: [Button, Icon, DatePipe],
  templateUrl: './super-admin-tournament-detail-popup.html',
  styleUrl: './super-admin-tournament-detail-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminTournamentDetailPopupComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  readonly dialogRef = inject(DialogRef<void>);
  readonly data = inject<SuperAdminTournamentDetailData>(DIALOG_DATA);

  readonly detail = this.store.selectSignal(selectSuperAdminTournamentDetail);
  readonly statusLabels = STATUS_LABELS;

  ngOnInit(): void {
    this.store.dispatch(loadSuperAdminTournamentDetail({ id: this.data.id }));
  }

  ngOnDestroy(): void {
    this.store.dispatch(clearSuperAdminTournamentDetail());
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
