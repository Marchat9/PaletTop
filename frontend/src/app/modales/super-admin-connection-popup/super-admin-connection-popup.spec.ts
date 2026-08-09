import { TestBed } from '@angular/core/testing';
import { DialogRef } from '@angular/cdk/dialog';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { SuperAdminConnectionPopupComponent } from './super-admin-connection-popup';
import { clearSuperAdminSession, connectSuperAdmin } from 'src/app/store/superadmin/superadmin.actions';

function setup(authentication: { data: string | null; isLoading: boolean; error: string | null }) {
  const dialogRefMock = { close: vi.fn() };

  TestBed.configureTestingModule({
    imports: [SuperAdminConnectionPopupComponent],
    providers: [
      { provide: DialogRef, useValue: dialogRefMock },
      provideMockStore({ initialState: { superadmin: { authentication } } }),
    ],
  });

  const store = TestBed.inject(MockStore);
  vi.spyOn(store, 'dispatch');

  const fixture = TestBed.createComponent(SuperAdminConnectionPopupComponent);
  fixture.detectChanges();
  return { fixture, dialogRefMock, store };
}

describe('SuperAdminConnectionPopupComponent', () => {
  it('clears any previous session state on init', () => {
    const { store } = setup({ data: null, isLoading: false, error: null });
    expect(store.dispatch).toHaveBeenCalledWith(clearSuperAdminSession());
  });

  it('disables the connect button until a password is entered', () => {
    const { fixture } = setup({ data: null, isLoading: false, error: null });
    expect(fixture.componentInstance.canConnect()).toBe(false);

    fixture.componentInstance.onPasswordChange('secret');
    expect(fixture.componentInstance.canConnect()).toBe(true);
  });

  it('dispatches connectSuperAdmin with the trimmed password on connect', () => {
    const { fixture, store } = setup({ data: null, isLoading: false, error: null });
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onPasswordChange('  secret  ');
    fixture.componentInstance.onConnect();

    expect(store.dispatch).toHaveBeenCalledWith(connectSuperAdmin({ password: 'secret' }));
  });

  it('shows an error message when the store reports an authentication error', () => {
    const { fixture } = setup({ data: null, isLoading: false, error: 'Mot de passe invalide' });
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Mot de passe invalide');
  });

  it('closes the dialog without dispatching further actions on cancel', () => {
    const { fixture, dialogRefMock, store } = setup({ data: null, isLoading: false, error: null });
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onCancel();

    expect(dialogRefMock.close).toHaveBeenCalledWith();
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('closes the dialog with true once the store reports a validated password', () => {
    const { fixture, dialogRefMock, store } = setup({ data: null, isLoading: false, error: null });

    store.setState({ superadmin: { authentication: { data: 'secret', isLoading: false, error: null } } });
    store.refreshState();
    fixture.detectChanges();

    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });
});
