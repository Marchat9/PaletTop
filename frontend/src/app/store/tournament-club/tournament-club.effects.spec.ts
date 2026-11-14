import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, ReplaySubject, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TournamentClubService } from 'src/app/services/tournament-club.service';
import { selectCurrentTournamentAdminInformations } from 'src/app/store/tournament/tournament.selectors';
import {
  searchTournamentClubs,
  searchTournamentClubsFailure,
  searchTournamentClubsSuccess,
} from './tournament-club.actions';
import { TournamentClubEffects } from './tournament-club.effects';

function setup(searchClubs: (...args: unknown[]) => Observable<string[]>) {
  const actions$ = new ReplaySubject<Action>(1);
  const service = { searchClubs: vi.fn(searchClubs) };
  TestBed.configureTestingModule({
    providers: [
      TournamentClubEffects,
      provideMockActions(() => actions$),
      provideMockStore({
        selectors: [
          {
            selector: selectCurrentTournamentAdminInformations,
            value: { code: 'ABC', password: 'secret' },
          },
        ],
      }),
      { provide: TournamentClubService, useValue: service },
    ],
  });
  const emitted: Action[] = [];
  TestBed.inject(TournamentClubEffects).search$.subscribe((a) => emitted.push(a));
  return { actions$, emitted, service };
}

describe('TournamentClubEffects', () => {
  it('calls the service with the admin password', () => {
    const { actions$, emitted, service } = setup(() => of(['Laiton']));
    actions$.next(searchTournamentClubs({ code: 'ABC', search: 'lai' }));
    expect(service.searchClubs).toHaveBeenCalledWith('ABC', 'lai', 'secret');
    expect(emitted).toEqual([searchTournamentClubsSuccess({ search: 'lai', clubs: ['Laiton'] })]);
  });

  it('cancels the previous request on a new search', () => {
    const first = new Subject<string[]>();
    const second = new Subject<string[]>();
    const responses = [first, second];
    const { actions$, emitted } = setup(() => responses.shift()!);
    actions$.next(searchTournamentClubs({ code: 'ABC', search: 'l' }));
    actions$.next(searchTournamentClubs({ code: 'ABC', search: 'la' }));
    first.next(['Old']);
    second.next(['New']);
    expect(emitted).toEqual([searchTournamentClubsSuccess({ search: 'la', clubs: ['New'] })]);
  });

  it('maps an error to the failure action', () => {
    const { actions$, emitted } = setup(() => throwError(() => 'Oops'));
    actions$.next(searchTournamentClubs({ code: 'ABC', search: 'lai' }));
    expect(emitted).toEqual([searchTournamentClubsFailure({ error: 'Oops' })]);
  });
});
