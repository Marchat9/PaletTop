import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import {
  SuperAdminPasswordResetKind,
  SuperAdminPasswordResetPopupComponent,
} from './super-admin-password-reset-popup';
import { resetSuperAdminTournamentPassword } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';
import { resetSuperAdminTrainingPassword } from 'src/app/store/superadmin-trainings/superadmin-trainings.actions';

const IDLE = { isLoading: false, error: null };

function setup(
  kind: SuperAdminPasswordResetKind = 'tournament',
  trainingRequest: { isLoading: boolean; error: string | null } = IDLE,
) {
  const dialogRefMock = { close: vi.fn() };
  const data = { kind, id: 'id-1', code: 'CODE-1', name: 'Test' };

  TestBed.configureTestingModule({
    imports: [SuperAdminPasswordResetPopupComponent],
    providers: [
      { provide: DialogRef, useValue: dialogRefMock },
      { provide: DIALOG_DATA, useValue: data },
      provideMockStore({
        initialState: {
          superAdminTournaments: { passwordResetRequest: IDLE },
          superAdminTrainings: { passwordResetRequest: trainingRequest },
        },
      }),
    ],
  });

  const store = TestBed.inject(MockStore);
  vi.spyOn(store, 'dispatch');

  const fixture = TestBed.createComponent(SuperAdminPasswordResetPopupComponent);
  fixture.detectChanges();
  return { fixture, dialogRefMock, store };
}

describe('SuperAdminPasswordResetPopupComponent', () => {
  it('disables the confirm button until a password is entered', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance.canConfirm()).toBe(false);

    fixture.componentInstance.onPasswordChange('secret');
    expect(fixture.componentInstance.canConfirm()).toBe(true);
  });

  it('dispatches resetSuperAdminTournamentPassword with the trimmed password for a tournament', () => {
    const { fixture, store } = setup('tournament');

    fixture.componentInstance.onPasswordChange('  secret  ');
    fixture.componentInstance.onConfirm();

    expect(store.dispatch).toHaveBeenCalledWith(
      resetSuperAdminTournamentPassword({ id: 'id-1', newPassword: 'secret' }),
    );
  });

  it('dispatches resetSuperAdminTrainingPassword for a training', () => {
    const { fixture, store } = setup('training');

    fixture.componentInstance.onPasswordChange('secret');
    fixture.componentInstance.onConfirm();

    expect(store.dispatch).toHaveBeenCalledWith(
      resetSuperAdminTrainingPassword({ id: 'id-1', newPassword: 'secret' }),
    );
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Entraînement');
  });

  it('reads the request state of its own kind', () => {
    const { fixture } = setup('training', { isLoading: false, error: 'boom' });
    expect(fixture.componentInstance.request().error).toBe('boom');
  });

  it('closes without dispatching on cancel', () => {
    const { fixture, dialogRefMock, store } = setup();
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onCancel();

    expect(dialogRefMock.close).toHaveBeenCalledWith();
    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
