import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { MetricTileComponent } from 'src/app/shared/metric-tile/metric-tile';
import { loadMetrics } from 'src/app/store/metrics/metrics.actions';
import { selectMetrics } from 'src/app/store/metrics/metrics.selectors';
import { clearSuperAdminSession } from 'src/app/store/superadmin/superadmin.actions';
import { selectSuperAdminPassword } from 'src/app/store/superadmin/superadmin.selectors';
import { SuperAdminClubTableComponent } from './components/super-admin-club-table/super-admin-club-table';
import { SuperAdminTournamentTableComponent } from './components/super-admin-tournament-table/super-admin-tournament-table';

@Component({
  selector: 'app-super-admin-page',
  imports: [
    CardCollapsible,
    MetricTileComponent,
    SuperAdminClubTableComponent,
    SuperAdminTournamentTableComponent,
  ],
  templateUrl: './super-admin-page.html',
  styleUrl: './super-admin-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminPageComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  private readonly tournamentTable = viewChild(SuperAdminTournamentTableComponent);

  public readonly metrics = this.store.selectSignal(selectMetrics);

  // Template references TournamentStatus.ACTIVE/.DRAFT/.FINISHED directly (not
  // string literals like 'ACTIVE') — TypeScript string enums are nominal types,
  // so a bare string literal isn't assignable to a TournamentStatus-typed
  // parameter even when the runtime value matches.
  readonly TournamentStatus = TournamentStatus;

  constructor() {
    if (this.store.selectSignal(selectSuperAdminPassword)() === null) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit(): void {
    this.store.dispatch(loadMetrics());
  }

  ngOnDestroy(): void {
    this.store.dispatch(clearSuperAdminSession());
  }

  onStatTileClick(status: TournamentStatus): void {
    this.tournamentTable()?.applyStatusFilter(status);
  }
}
