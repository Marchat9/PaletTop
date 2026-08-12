import { ActivatedRoute } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { describe, expect, it, vi } from 'vitest';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import {
  selectSpectatorCurrentSession,
  selectSpectatorRanking,
  selectSpectatorTournamentData,
  selectSpectatorTournamentError,
  selectSpectatorTournamentIsLoading,
} from 'src/app/store/spectator/spectator.selectors';
import { loadSpectatorTournament } from 'src/app/store/spectator/spectator.actions';
import { SpectatorPageComponent } from './spectator-page';

function setup(tournamentData: unknown = null) {
  const activatedRoute = {
    snapshot: { paramMap: { get: () => 'ABC123' } },
  } as unknown as ActivatedRoute;

  TestBed.configureTestingModule({
    imports: [SpectatorPageComponent],
    providers: [
      { provide: ActivatedRoute, useValue: activatedRoute },
      provideMockStore({
        selectors: [
          { selector: selectSpectatorTournamentData, value: tournamentData },
          { selector: selectSpectatorTournamentIsLoading, value: false },
          { selector: selectSpectatorTournamentError, value: null },
          { selector: selectSpectatorCurrentSession, value: null },
          { selector: selectSpectatorRanking, value: [] },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(SpectatorPageComponent);
  const store = TestBed.inject(MockStore);
  return { fixture, store };
}

describe('SpectatorPageComponent', () => {
  it('dispatches loadSpectatorTournament with the route code when no data is loaded yet', () => {
    const { fixture, store } = setup(null);
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(loadSpectatorTournament({ tournamentCode: 'ABC123' }));
  });

  it('does not re-dispatch once tournament data is already present', () => {
    const { fixture, store } = setup({
      id: 't-1',
      code: 'ABC123',
      name: 'Tournoi',
      status: TournamentStatus.ACTIVE,
      scoreCalculation: 'score',
    });
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.detectChanges();

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: loadSpectatorTournament.type }),
    );
  });
});
