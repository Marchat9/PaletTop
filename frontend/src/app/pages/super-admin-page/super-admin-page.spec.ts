import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { ConfirmationPopupComponent } from 'src/app/modales/confirmation-popup/confirmation-popup';
import { SuperAdminClubRenamePopupComponent } from 'src/app/modales/super-admin-club-rename-popup/super-admin-club-rename-popup';
import { SuperAdminTournamentDeletePopupComponent } from 'src/app/modales/super-admin-tournament-delete-popup/super-admin-tournament-delete-popup';
import { SuperAdminTournamentDetailPopupComponent } from 'src/app/modales/super-admin-tournament-detail-popup/super-admin-tournament-detail-popup';
import { SuperAdminTournamentPasswordResetPopupComponent } from 'src/app/modales/super-admin-tournament-password-reset-popup/super-admin-tournament-password-reset-popup';
import { SuperAdminTournamentStatusPopupComponent } from 'src/app/modales/super-admin-tournament-status-popup/super-admin-tournament-status-popup';
import { SuperAdminClubSummaryDto } from 'src/app/services/super-admin-club.service';
import { SuperAdminTournamentSummaryDto } from 'src/app/services/super-admin-tournament.service';
import { loadMetrics } from 'src/app/store/metrics/metrics.actions';
import {
  deleteSuperAdminClubs,
  searchSuperAdminClubs,
} from 'src/app/store/superadmin-clubs/superadmin-clubs.actions';
import {
  deleteSuperAdminTournaments,
  searchSuperAdminTournaments,
} from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';
import { clearSuperAdminSession } from 'src/app/store/superadmin/superadmin.actions';
import { SuperAdminPageComponent } from './super-admin-page';

const TOURNAMENT_CRITERIA = {
  page: 1,
  pageSize: 20,
  search: '',
  status: null,
  sortBy: 'createdAt' as const,
  sortDir: 'DESC' as const,
};

const CLUB_CRITERIA = {
  page: 1,
  pageSize: 20,
  search: '',
  sortBy: 'name' as const,
  sortDir: 'ASC' as const,
};

const DRAFT_TOURNAMENT: SuperAdminTournamentSummaryDto = {
  id: 'id-draft',
  code: 'DRAFT-01',
  name: 'Tournoi Brouillon',
  status: TournamentStatus.DRAFT,
  date: '2026-08-10',
  teamsCount: 4,
  createdAt: '2026-08-01T10:00:00.000Z',
};

const ACTIVE_TOURNAMENT: SuperAdminTournamentSummaryDto = {
  id: 'id-active',
  code: 'ACTIVE-01',
  name: 'Tournoi Actif',
  status: TournamentStatus.ACTIVE,
  date: '2026-08-10',
  teamsCount: 6,
  createdAt: '2026-08-02T10:00:00.000Z',
};

const CLUB_WITH_PLAYERS: SuperAdminClubSummaryDto = {
  id: 'id-with-players',
  name: 'Palet Club Nantais',
  playersCount: 3,
};

const CLUB_WITHOUT_PLAYERS: SuperAdminClubSummaryDto = {
  id: 'id-without-players',
  name: 'Saint-Étienne',
  playersCount: 0,
};

function setup(
  password: string | null = 'secret',
  tournamentItems: SuperAdminTournamentSummaryDto[] = [DRAFT_TOURNAMENT, ACTIVE_TOURNAMENT],
  clubItems: SuperAdminClubSummaryDto[] = [CLUB_WITH_PLAYERS, CLUB_WITHOUT_PLAYERS],
  closedValue: unknown = true,
) {
  const routerMock = { navigate: vi.fn() };
  const dialogMock = { open: vi.fn().mockReturnValue({ closed: of(closedValue) }) };

  TestBed.configureTestingModule({
    imports: [SuperAdminPageComponent],
    providers: [
      { provide: Router, useValue: routerMock },
      { provide: Dialog, useValue: dialogMock },
      provideMockStore({
        initialState: {
          superadmin: { authentication: { data: password, isLoading: false, error: null } },
          metrics: { data: null, isLoading: false, error: null },
          superAdminTournaments: {
            list: {
              items: tournamentItems,
              total: tournamentItems.length,
              criteria: TOURNAMENT_CRITERIA,
              isLoading: false,
              error: null,
            },
            detail: { data: null, isLoading: false, error: null },
            deleteRequest: { isLoading: false, error: null },
            statusChangeRequest: { isLoading: false, error: null },
            passwordResetRequest: { isLoading: false, error: null },
          },
          superAdminClubs: {
            list: {
              items: clubItems,
              total: clubItems.length,
              criteria: CLUB_CRITERIA,
              isLoading: false,
              error: null,
            },
            renameRequest: { isLoading: false, error: null },
            deleteRequest: { isLoading: false, error: null },
          },
        },
      }),
    ],
  });

  const store = TestBed.inject(MockStore);
  vi.spyOn(store, 'dispatch');

  const fixture = TestBed.createComponent(SuperAdminPageComponent);
  fixture.detectChanges();
  return { fixture, routerMock, dialogMock, store };
}

describe('SuperAdminPageComponent', () => {
  it('redirects to "/" when no password is stored (direct URL access)', () => {
    const { routerMock } = setup(null);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });

  it('does not redirect when a password is stored', () => {
    const { routerMock } = setup('secret');
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('clears the super admin session when the component is destroyed', () => {
    const { fixture, store } = setup('secret');
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.destroy();

    expect(store.dispatch).toHaveBeenCalledWith(clearSuperAdminSession());
  });

  it('loads metrics and both tables on init', () => {
    const { store } = setup('secret');

    expect(store.dispatch).toHaveBeenCalledWith(loadMetrics());
    expect(store.dispatch).toHaveBeenCalledWith(
      searchSuperAdminTournaments({ criteria: TOURNAMENT_CRITERIA }),
    );
    expect(store.dispatch).toHaveBeenCalledWith(searchSuperAdminClubs({ criteria: CLUB_CRITERIA }));
  });

  it('refresh() re-dispatches metrics and both tables using their current criteria', () => {
    const { fixture, store } = setup('secret');
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.refresh();

    expect(store.dispatch).toHaveBeenCalledWith(loadMetrics());
    expect(store.dispatch).toHaveBeenCalledWith(
      searchSuperAdminTournaments({ criteria: TOURNAMENT_CRITERIA }),
    );
    expect(store.dispatch).toHaveBeenCalledWith(searchSuperAdminClubs({ criteria: CLUB_CRITERIA }));
  });

  it('filters the tournament table by status when a stat tile is clicked', () => {
    const { fixture, store } = setup('secret');
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onStatTileClick(TournamentStatus.ACTIVE);

    expect(store.dispatch).toHaveBeenCalledWith(
      searchSuperAdminTournaments({
        criteria: { ...TOURNAMENT_CRITERIA, status: TournamentStatus.ACTIVE, page: 1 },
      }),
    );
  });

  it('dispatches searchSuperAdminTournaments when the tournament table requests a search', () => {
    const { fixture, store } = setup('secret');
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();
    const criteria = { ...TOURNAMENT_CRITERIA, search: 'chandeleur' };

    fixture.componentInstance.onTournamentSearch(criteria);

    expect(store.dispatch).toHaveBeenCalledWith(searchSuperAdminTournaments({ criteria }));
  });

  it('opens the tournament detail popup with the requested id', () => {
    const { fixture, dialogMock } = setup('secret');

    fixture.componentInstance.onTournamentDetailRequested(DRAFT_TOURNAMENT.id);

    expect(dialogMock.open).toHaveBeenCalledWith(
      SuperAdminTournamentDetailPopupComponent,
      expect.objectContaining({ data: { id: DRAFT_TOURNAMENT.id } }),
    );
  });

  it('opens the password reset popup with id, code, and name', () => {
    const { fixture, dialogMock } = setup('secret');

    fixture.componentInstance.onTournamentPasswordResetRequested(DRAFT_TOURNAMENT);

    expect(dialogMock.open).toHaveBeenCalledWith(
      SuperAdminTournamentPasswordResetPopupComponent,
      expect.objectContaining({
        data: { id: DRAFT_TOURNAMENT.id, code: DRAFT_TOURNAMENT.code, name: DRAFT_TOURNAMENT.name },
      }),
    );
  });

  it('deleting a DRAFT tournament opens the plain confirmation popup', () => {
    const { fixture, dialogMock } = setup('secret');

    fixture.componentInstance.onTournamentDeleteOneRequested(DRAFT_TOURNAMENT);

    expect(dialogMock.open).toHaveBeenCalledWith(ConfirmationPopupComponent, expect.anything());
  });

  it('deleting an ACTIVE tournament opens the reinforced delete popup instead', () => {
    const { fixture, dialogMock } = setup('secret');

    fixture.componentInstance.onTournamentDeleteOneRequested(ACTIVE_TOURNAMENT);

    expect(dialogMock.open).toHaveBeenCalledWith(
      SuperAdminTournamentDeletePopupComponent,
      expect.objectContaining({
        data: {
          id: ACTIVE_TOURNAMENT.id,
          code: ACTIVE_TOURNAMENT.code,
          name: ACTIVE_TOURNAMENT.name,
        },
      }),
    );
  });

  it('dispatches deleteSuperAdminTournaments when a plain single delete is confirmed', () => {
    const { fixture, store } = setup('secret');
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onTournamentDeleteOneRequested(DRAFT_TOURNAMENT);

    expect(store.dispatch).toHaveBeenCalledWith(
      deleteSuperAdminTournaments({ ids: [DRAFT_TOURNAMENT.id] }),
    );
  });

  it('bulk-deleting a selection with no ACTIVE tournaments shows the plain confirmation message', () => {
    const { fixture, dialogMock } = setup('secret');

    fixture.componentInstance.onTournamentDeleteSelectionRequested([DRAFT_TOURNAMENT.id]);

    expect(dialogMock.open).toHaveBeenCalledWith(
      ConfirmationPopupComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          message: 'Supprimer les 1 tournois sélectionnés ? Cette action est irréversible.',
        }),
      }),
    );
  });

  it('bulk-deleting a selection that includes an ACTIVE tournament shows the "at least one active" warning', () => {
    const { fixture, dialogMock } = setup('secret');

    fixture.componentInstance.onTournamentDeleteSelectionRequested([
      DRAFT_TOURNAMENT.id,
      ACTIVE_TOURNAMENT.id,
    ]);

    expect(dialogMock.open).toHaveBeenCalledWith(
      ConfirmationPopupComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          message: expect.stringContaining('dont au moins un tournoi actif'),
        }),
      }),
    );
  });

  it('dispatches deleteSuperAdminTournaments for the selection when confirmed', () => {
    const { fixture, store } = setup('secret');
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onTournamentDeleteSelectionRequested([DRAFT_TOURNAMENT.id]);

    expect(store.dispatch).toHaveBeenCalledWith(
      deleteSuperAdminTournaments({ ids: [DRAFT_TOURNAMENT.id] }),
    );
  });

  it('does not dispatch a bulk delete when the confirmation popup is dismissed', () => {
    const { fixture, store } = setup('secret', undefined, undefined, false);
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onTournamentDeleteSelectionRequested([DRAFT_TOURNAMENT.id]);

    expect(store.dispatch).not.toHaveBeenCalledWith(
      deleteSuperAdminTournaments({ ids: [DRAFT_TOURNAMENT.id] }),
    );
  });

  it('opens the status popup for the requested ids', () => {
    const { fixture, dialogMock } = setup('secret');

    fixture.componentInstance.onTournamentStatusChangeRequested([
      DRAFT_TOURNAMENT.id,
      ACTIVE_TOURNAMENT.id,
    ]);

    expect(dialogMock.open).toHaveBeenCalledWith(
      SuperAdminTournamentStatusPopupComponent,
      expect.objectContaining({ data: { ids: [DRAFT_TOURNAMENT.id, ACTIVE_TOURNAMENT.id] } }),
    );
  });

  it('dispatches searchSuperAdminClubs when the club table requests a search', () => {
    const { fixture, store } = setup('secret');
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();
    const criteria = { ...CLUB_CRITERIA, search: 'nantes' };

    fixture.componentInstance.onClubSearch(criteria);

    expect(store.dispatch).toHaveBeenCalledWith(searchSuperAdminClubs({ criteria }));
  });

  it('opens the rename popup with the club id and name', () => {
    const { fixture, dialogMock } = setup('secret');

    fixture.componentInstance.onClubRenameRequested(CLUB_WITH_PLAYERS);

    expect(dialogMock.open).toHaveBeenCalledWith(
      SuperAdminClubRenamePopupComponent,
      expect.objectContaining({
        data: { id: CLUB_WITH_PLAYERS.id, name: CLUB_WITH_PLAYERS.name },
      }),
    );
  });

  it('deleting a club with players attached warns about dissociation in the confirmation message', () => {
    const { fixture, dialogMock } = setup('secret');

    fixture.componentInstance.onClubDeleteOneRequested(CLUB_WITH_PLAYERS);

    expect(dialogMock.open).toHaveBeenCalledWith(
      ConfirmationPopupComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          message: expect.stringContaining('3 joueur(s) actuellement rattachés seront dissociés'),
        }),
      }),
    );
  });

  it('deleting a club with no players attached uses the "no players" wording instead', () => {
    const { fixture, dialogMock } = setup('secret');

    fixture.componentInstance.onClubDeleteOneRequested(CLUB_WITHOUT_PLAYERS);

    expect(dialogMock.open).toHaveBeenCalledWith(
      ConfirmationPopupComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          message: expect.stringContaining("Aucun joueur n'y est rattaché"),
        }),
      }),
    );
  });

  it('dispatches deleteSuperAdminClubs for a single club when confirmed', () => {
    const { fixture, store } = setup('secret');
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onClubDeleteOneRequested(CLUB_WITH_PLAYERS);

    expect(store.dispatch).toHaveBeenCalledWith(
      deleteSuperAdminClubs({ ids: [CLUB_WITH_PLAYERS.id] }),
    );
  });

  it('dispatches deleteSuperAdminClubs for the selection when confirmed', () => {
    const { fixture, store } = setup('secret');
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onClubDeleteSelectionRequested([
      CLUB_WITH_PLAYERS.id,
      CLUB_WITHOUT_PLAYERS.id,
    ]);

    expect(store.dispatch).toHaveBeenCalledWith(
      deleteSuperAdminClubs({ ids: [CLUB_WITH_PLAYERS.id, CLUB_WITHOUT_PLAYERS.id] }),
    );
  });
});
