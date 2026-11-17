import { Dialog } from '@angular/cdk/dialog';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { selectCurrentTournamentAdminInformations } from 'src/app/store/tournament/tournament.selectors';
import { selectCurrentTrainingAdminInformations } from 'src/app/store/training/training.selectors';
import { ConnectionPage } from './connection-page';
import {
  ADMIN_TOURNAMENT_CONNECTION,
  ADMIN_TRAINING_CONNECTION,
  PLAYER_TOURNAMENT_CONNECTION,
  PLAYER_TRAINING_CONNECTION,
  SPECTATOR_TOURNAMENT_CONNECTION,
  SPECTATOR_TRAINING_CONNECTION,
} from './connection-page.configs';
import { CONNECTION_ROUTE_DATA_KEY, ConnectionPageConfig } from './connection-page.model';

@Component({ selector: 'app-fake-popup', template: '' })
class FakePopup {}

interface SetupOptions {
  closedValue?: unknown;
  adminInfo?: { code: string; password: string } | null;
  queryCode?: string;
}

async function setup<T>(config: ConnectionPageConfig<T>, options: SetupOptions = {}) {
  const routerMock = { navigate: vi.fn() };
  const dialogMock = { open: vi.fn().mockReturnValue({ closed: of(options.closedValue) }) };
  const withFakePopup = { ...config, popup: () => Promise.resolve(FakePopup) };
  TestBed.configureTestingModule({
    providers: [
      { provide: Router, useValue: routerMock },
      { provide: Dialog, useValue: dialogMock },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            data: { [CONNECTION_ROUTE_DATA_KEY]: withFakePopup },
            queryParamMap: convertToParamMap(options.queryCode ? { code: options.queryCode } : {}),
          },
        },
      },
      provideMockStore({
        selectors: [
          { selector: selectCurrentTrainingAdminInformations, value: options.adminInfo ?? null },
          { selector: selectCurrentTournamentAdminInformations, value: options.adminInfo ?? null },
        ],
      }),
    ],
  });
  TestBed.createComponent(ConnectionPage);
  await vi.waitFor(() => expect(routerMock.navigate).toHaveBeenCalled());
  return { routerMock, dialogMock };
}

describe('ConnectionPage', () => {
  it('leads to the page the typed codes open', async () => {
    const { routerMock } = await setup(PLAYER_TRAINING_CONNECTION, {
      closedValue: { sessionCode: '1234', participantCode: '5678' },
    });

    expect(routerMock.navigate).toHaveBeenCalledWith(['/player/training/1234/5678']);
  });

  it('goes back home when the popup is cancelled', async () => {
    const { routerMock } = await setup(SPECTATOR_TRAINING_CONNECTION);

    expect(routerMock.navigate).toHaveBeenCalledWith(['/accueil']);
  });

  it('skips the popup when the admin access is already known', async () => {
    const { routerMock, dialogMock } = await setup(ADMIN_TRAINING_CONNECTION, {
      adminInfo: { code: 'ABCD', password: 'secret' },
    });

    expect(dialogMock.open).not.toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/training/ABCD']);
  });

  it('asks the admin for their access when none is known', async () => {
    const { routerMock, dialogMock } = await setup(ADMIN_TRAINING_CONNECTION, {
      closedValue: { trainingCode: 'NEW1' },
    });

    expect(dialogMock.open).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/training/NEW1']);
  });

  it('passes the tournament code of the URL to the admin popup', async () => {
    const { dialogMock } = await setup(ADMIN_TOURNAMENT_CONNECTION, {
      closedValue: { tournamentCode: 'LAITON' },
      queryCode: 'LAITON',
    });

    expect(dialogMock.open).toHaveBeenCalledWith(
      FakePopup,
      expect.objectContaining({ data: { tournamentCode: 'LAITON' } }),
    );
  });
});

describe('connection configs', () => {
  it('lead each universe to its page', () => {
    expect(PLAYER_TOURNAMENT_CONNECTION.target({ tournamentCode: 'T', teamCode: '1234' })).toEqual([
      '/player/tournament/T/1234',
    ]);
    expect(SPECTATOR_TOURNAMENT_CONNECTION.target({ tournamentCode: 'T' })).toEqual([
      '/spectateur',
      'T',
    ]);
    expect(SPECTATOR_TRAINING_CONNECTION.target({ sessionCode: '123456' })).toEqual([
      '/spectateur/training',
      '123456',
    ]);
    expect(ADMIN_TOURNAMENT_CONNECTION.target({ tournamentCode: 'T' })).toEqual([
      '/admin/tournament/T',
    ]);
  });
});
