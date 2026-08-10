import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { SuperAdminTournamentStatusPopupComponent } from './super-admin-tournament-status-popup';
import { changeSuperAdminTournamentsStatus } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';

function setup(statusChangeRequest: { isLoading: boolean; error: string | null }) {
  const dialogRefMock = { close: vi.fn() };
  const data = { ids: ['id-1', 'id-2'] };

  TestBed.configureTestingModule({
    imports: [SuperAdminTournamentStatusPopupComponent],
    providers: [
      { provide: DialogRef, useValue: dialogRefMock },
      { provide: DIALOG_DATA, useValue: data },
      provideMockStore({
        initialState: {
          superAdminTournaments: {
            statusChangeRequest,
            deleteRequest: { isLoading: false, error: null },
            passwordResetRequest: { isLoading: false, error: null },
            list: { items: [], total: 0, criteria: {}, isLoading: false, error: null },
            detail: { data: null, isLoading: false, error: null },
          },
        },
      }),
    ],
  });

  const store = TestBed.inject(MockStore);
  vi.spyOn(store, 'dispatch');

  const fixture = TestBed.createComponent(SuperAdminTournamentStatusPopupComponent);
  fixture.detectChanges();
  return { fixture, dialogRefMock, store };
}

describe('SuperAdminTournamentStatusPopupComponent', () => {
  it('disables confirm until a status is picked', () => {
    const { fixture } = setup({ isLoading: false, error: null });
    expect(fixture.componentInstance.canConfirm()).toBe(false);

    fixture.componentInstance.onSelectStatus(TournamentStatus.CANCELLED);
    expect(fixture.componentInstance.canConfirm()).toBe(true);
  });

  it('dispatches changeSuperAdminTournamentsStatus with all selected ids and the picked status', () => {
    const { fixture, store } = setup({ isLoading: false, error: null });

    fixture.componentInstance.onSelectStatus(TournamentStatus.CANCELLED);
    fixture.componentInstance.onConfirm();

    expect(store.dispatch).toHaveBeenCalledWith(
      changeSuperAdminTournamentsStatus({
        ids: ['id-1', 'id-2'],
        status: TournamentStatus.CANCELLED,
      }),
    );
  });

  it('allows picking any of the 4 statuses, not just CANCELLED', () => {
    const { fixture } = setup({ isLoading: false, error: null });
    expect(fixture.componentInstance.statusOptions.map((o) => o.value)).toEqual([
      TournamentStatus.DRAFT,
      TournamentStatus.ACTIVE,
      TournamentStatus.FINISHED,
      TournamentStatus.CANCELLED,
    ]);
  });
});
