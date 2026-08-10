import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { SuperAdminTournamentPasswordResetPopupComponent } from './super-admin-tournament-password-reset-popup';
import { resetSuperAdminTournamentPassword } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';

function setup(passwordResetRequest: { isLoading: boolean; error: string | null }) {
  const dialogRefMock = { close: vi.fn() };
  const data = { id: 'id-1', code: 'CODE-1', name: 'Tournoi Test' };

  TestBed.configureTestingModule({
    imports: [SuperAdminTournamentPasswordResetPopupComponent],
    providers: [
      { provide: DialogRef, useValue: dialogRefMock },
      { provide: DIALOG_DATA, useValue: data },
      provideMockStore({
        initialState: {
          superAdminTournaments: {
            passwordResetRequest,
            deleteRequest: { isLoading: false, error: null },
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

  const fixture = TestBed.createComponent(SuperAdminTournamentPasswordResetPopupComponent);
  fixture.detectChanges();
  return { fixture, dialogRefMock, store };
}

describe('SuperAdminTournamentPasswordResetPopupComponent', () => {
  it('disables the confirm button until a password is entered', () => {
    const { fixture } = setup({ isLoading: false, error: null });
    expect(fixture.componentInstance.canConfirm()).toBe(false);

    fixture.componentInstance.onPasswordChange('secret');
    expect(fixture.componentInstance.canConfirm()).toBe(true);
  });

  it('dispatches resetSuperAdminTournamentPassword with the trimmed password on confirm', () => {
    const { fixture, store } = setup({ isLoading: false, error: null });

    fixture.componentInstance.onPasswordChange('  secret  ');
    fixture.componentInstance.onConfirm();

    expect(store.dispatch).toHaveBeenCalledWith(
      resetSuperAdminTournamentPassword({ id: 'id-1', newPassword: 'secret' }),
    );
  });

  it('closes without dispatching on cancel', () => {
    const { fixture, dialogRefMock, store } = setup({ isLoading: false, error: null });
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onCancel();

    expect(dialogRefMock.close).toHaveBeenCalledWith();
    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
