import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { environment } from 'src/environments/environment';
import { AutoScrollDirective } from 'src/app/shared/auto-scroll/auto-scroll.directive';
import { Icon } from 'src/app/shared/icon/icon';
import { RankingCard } from 'src/app/shared/ranking-card/ranking-card';
import { Switch } from 'src/app/shared/switch/switch';
import {
  leaveSpectatorPage,
  loadSpectatorTournament,
  resetSpectator,
} from 'src/app/store/spectator/spectator.actions';
import {
  selectSpectatorCurrentSession,
  selectSpectatorRanking,
  selectSpectatorTournamentData,
  selectSpectatorTournamentError,
  selectSpectatorTournamentIsLoading,
} from 'src/app/store/spectator/spectator.selectors';
import { onResyncRequested } from 'src/app/utils/resync-on-reconnect.util';
import { SpectatorMatchListComponent } from './spectator-match-list/spectator-match-list';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';

@Component({
  selector: 'app-spectator-page',
  imports: [SpectatorMatchListComponent, RankingCard, Switch, AutoScrollDirective, Icon],
  templateUrl: './spectator-page.html',
  styleUrl: './spectator-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpectatorPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);

  private readonly tournamentCode = this.route.snapshot.paramMap.get('tournamentCode');

  public readonly tournament = this.store.selectSignal(selectSpectatorTournamentData);
  public readonly isLoading = computed(
    () => !this.tournament() && this.store.selectSignal(selectSpectatorTournamentIsLoading)(),
  );
  public readonly error = this.store.selectSignal(selectSpectatorTournamentError);
  public readonly currentSession = this.store.selectSignal(selectSpectatorCurrentSession);
  public readonly ranking = this.store.selectSignal(selectSpectatorRanking);

  public readonly autoScrollOn = signal(true);
  public readonly isMobile = signal(false);
  public readonly tournamentStatus = computed(() => this.tournament()?.status);
  public readonly isTournamentEnded = computed(
    () =>
      this.tournamentStatus() === TournamentStatus.FINISHED ||
      this.tournamentStatus() === TournamentStatus.CANCELLED,
  );

  constructor() {
    effect(() => {
      if (!this.tournamentCode) return;
      if (!this.tournament() && !this.isLoading() && !this.error()) {
        this.store.dispatch(loadSpectatorTournament({ tournamentCode: this.tournamentCode }));
      }
    });

    onResyncRequested(() => {
      if (!this.tournamentCode) return;
      this.store.dispatch(loadSpectatorTournament({ tournamentCode: this.tournamentCode }));
    });

    this.destroyRef.onDestroy(() => {
      this.store.dispatch(resetSpectator());
      this.store.dispatch(leaveSpectatorPage());
    });

    if (typeof window !== 'undefined') {
      const setMode = () => this.isMobile.set(window.innerWidth < environment.limitMobileSizePx);
      setMode();
      window.addEventListener('resize', setMode);
      this.destroyRef.onDestroy(() => window.removeEventListener('resize', setMode));
    }
  }
}
