import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, ReplaySubject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TeamService } from 'src/app/services/team.service';
import { TournamentService } from 'src/app/services/tournament.service';
import { TournamentConfigurationDto } from 'src/app/models/tournament-configuration.model';
import { addNotification } from '../app-config/app-config.actions';
import {
  connectTournamentAdministrator,
  updateTournamentAdministratorTeam,
  updateTournamentAdministratorTeamSuccess,
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

async function runTeamUpdate(
  action: Action,
  effectName: 'updateTournamentTeam$' | 'teamsImportedNotification$',
) {
  const actions$ = new ReplaySubject<Action>(1);
  TestBed.configureTestingModule({
    providers: [
      TournamentEffects,
      provideMockActions(() => actions$),
      provideMockStore({
        selectors: [
          {
            selector: selectCurrentTournamentAdminInformations,
            value: { code: 'ABCD', password: 'secret' },
          },
        ],
      }),
      { provide: Router, useValue: {} },
      { provide: TeamService, useValue: {} },
      {
        provide: TournamentService,
        useValue: { addTeamsToTournament: () => of({ code: 'ABCD' } as TournamentDto) },
      },
    ],
  });
  const emitted: Action[] = [];
  const effects = TestBed.inject(TournamentEffects);
  (effects[effectName] as Observable<Action>).subscribe((a) => emitted.push(a));
  actions$.next(action);
  await Promise.resolve();
  return emitted;
}

describe('TournamentEffects team import summary', () => {
  const importSummary = { importedCount: 13, ignoredCount: 1 };

  it('forwards importSummary to the success action', async () => {
    const emitted = await runTeamUpdate(
      updateTournamentAdministratorTeam({ code: 'ABCD', teams: [], importSummary }),
      'updateTournamentTeam$',
    );

    expect(emitted).toEqual([
      updateTournamentAdministratorTeamSuccess({
        tournament: { code: 'ABCD' } as TournamentDto,
        importSummary,
      }),
    ]);
  });

  it('notifies « 13 équipes importées · 1 ligne ignorée » after an import', async () => {
    const emitted = await runTeamUpdate(
      updateTournamentAdministratorTeamSuccess({
        tournament: { code: 'ABCD' } as TournamentDto,
        importSummary,
      }),
      'teamsImportedNotification$',
    );

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      type: addNotification.type,
      notification: {
        message: '13 équipes importées · 1 ligne ignorée',
        typeIcon: 'success',
      },
    });
  });

  it('does not notify on a single team creation', async () => {
    const emitted = await runTeamUpdate(
      updateTournamentAdministratorTeamSuccess({ tournament: { code: 'ABCD' } as TournamentDto }),
      'teamsImportedNotification$',
    );

    expect(emitted).toEqual([]);
  });
});
