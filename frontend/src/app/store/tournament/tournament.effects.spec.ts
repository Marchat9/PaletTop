import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { of, ReplaySubject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TeamService } from 'src/app/services/team.service';
import { TournamentService } from 'src/app/services/tournament.service';
import { TournamentConfigurationDto } from 'src/app/models/tournament-configuration.model';
import {
  connectTournamentAdministrator,
  updateTournamentAdministratorConfiguration,
  updateTournamentAdministratorConfigurationSuccess,
} from './tournament.admin.actions';
import { TournamentDto } from './tournament.models';
import { TournamentEffects } from './tournament.effects';
import { selectCurrentTournamentAdminInformations } from './tournament.selectors';

async function configure(savedCode: string) {
  const actions$ = new ReplaySubject<Action>(1);
  const router = { navigate: vi.fn(() => Promise.resolve(true)) };
  TestBed.configureTestingModule({
    providers: [
      TournamentEffects,
      provideMockActions(() => actions$),
      provideMockStore({
        selectors: [
          {
            selector: selectCurrentTournamentAdminInformations,
            value: { code: 'OLD-1', password: 'secret' },
          },
        ],
      }),
      { provide: Router, useValue: router },
      { provide: TeamService, useValue: {} },
      {
        provide: TournamentService,
        useValue: {
          updateTournamentConfiguration: () => of({ code: savedCode } as TournamentDto),
        },
      },
    ],
  });
  const emitted: Action[] = [];
  TestBed.inject(TournamentEffects).updateTournamentConfiguration$.subscribe((action) =>
    emitted.push(action),
  );
  actions$.next(
    updateTournamentAdministratorConfiguration({
      idtournament: 'id',
      tournament: {} as TournamentConfigurationDto,
    }),
  );
  await Promise.resolve();
  await Promise.resolve();
  return { router, emitted };
}

describe('TournamentEffects configuration update', () => {
  it('moves the URL to the new code and leaves the reconnection to the page', async () => {
    const { router, emitted } = await configure('NEW-2');

    expect(router.navigate).toHaveBeenCalledWith(['/admin/tournament', 'NEW-2'], {
      replaceUrl: true,
    });
    expect(emitted.map((action) => action.type)).toContain(
      updateTournamentAdministratorConfigurationSuccess.type,
    );
    expect(emitted.map((action) => action.type)).not.toContain(connectTournamentAdministrator.type);
  });

  it('keeps the session as is when the code does not change', async () => {
    const { router, emitted } = await configure('OLD-1');

    expect(router.navigate).not.toHaveBeenCalled();
    expect(emitted.map((action) => action.type)).not.toContain(connectTournamentAdministrator.type);
  });
});
