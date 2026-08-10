import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { SuperAdminTournamentDeletePopupComponent } from './super-admin-tournament-delete-popup';
import { deleteSuperAdminTournaments } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';

function setup(deleteRequest: { isLoading: boolean; error: string | null }) {
  const dialogRefMock = { close: vi.fn() };
  const data = { id: 'id-1', code: 'LAITON-2026', name: 'Tournoi de la Chandeleur' };

  TestBed.configureTestingModule({
    imports: [SuperAdminTournamentDeletePopupComponent],
    providers: [
      { provide: DialogRef, useValue: dialogRefMock },
      { provide: DIALOG_DATA, useValue: data },
      provideMockStore({
        initialState: {
          superAdminTournaments: {
            deleteRequest,
            passwordResetRequest: { isLoading: false, error: null },
            statusChangeRequest: { isLoading: false, error: null },
            list: { items: [], total: 0, criteria: {}, isLoading: false, error: null },
            detail: { data: null, isLoading: false, error: null },
          },
        },
      }),
    ],
  });

  const store = TestBed.inject(MockStore);
  vi.spyOn(store, 'dispatch');

  const fixture = TestBed.createComponent(SuperAdminTournamentDeletePopupComponent);
  fixture.detectChanges();
  return { fixture, dialogRefMock, store };
}

describe('SuperAdminTournamentDeletePopupComponent', () => {
  it('only enables confirm once the typed code exactly matches', () => {
    const { fixture } = setup({ isLoading: false, error: null });
    expect(fixture.componentInstance.canConfirm()).toBe(false);

    fixture.componentInstance.onInputChange('LAITON-202');
    expect(fixture.componentInstance.canConfirm()).toBe(false);

    fixture.componentInstance.onInputChange('LAITON-2026');
    expect(fixture.componentInstance.canConfirm()).toBe(true);
  });

  it('dispatches deleteSuperAdminTournaments with a single-element ids array on confirm', () => {
    const { fixture, store } = setup({ isLoading: false, error: null });

    fixture.componentInstance.onInputChange('LAITON-2026');
    fixture.componentInstance.onConfirm();

    expect(store.dispatch).toHaveBeenCalledWith(deleteSuperAdminTournaments({ ids: ['id-1'] }));
  });

  it('does not dispatch when the confirm button would be disabled', () => {
    const { fixture, store } = setup({ isLoading: false, error: null });
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onInputChange('wrong-code');
    fixture.componentInstance.onConfirm();

    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
