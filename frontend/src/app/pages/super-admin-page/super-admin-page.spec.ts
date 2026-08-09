import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { SuperAdminPageComponent } from './super-admin-page';
import { clearSuperAdminSession } from 'src/app/store/superadmin/superadmin.actions';

function setup(password: string | null) {
  const routerMock = { navigate: vi.fn() };

  TestBed.configureTestingModule({
    imports: [SuperAdminPageComponent],
    providers: [
      { provide: Router, useValue: routerMock },
      provideMockStore({
        initialState: {
          superadmin: { authentication: { data: password, isLoading: false, error: null } },
        },
      }),
    ],
  });

  const store = TestBed.inject(MockStore);
  vi.spyOn(store, 'dispatch');

  const fixture = TestBed.createComponent(SuperAdminPageComponent);
  fixture.detectChanges();
  return { fixture, routerMock, store };
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
});
