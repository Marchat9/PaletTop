import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { SuperAdminTournamentDetailPopupComponent } from './super-admin-tournament-detail-popup';
import {
  clearSuperAdminTournamentDetail,
  loadSuperAdminTournamentDetail,
} from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';

function setup(detail: { data: any; isLoading: boolean; error: string | null }) {
  const dialogRefMock = { close: vi.fn() };
  const data = { id: 'id-1' };

  TestBed.configureTestingModule({
    imports: [SuperAdminTournamentDetailPopupComponent],
    providers: [
      { provide: DialogRef, useValue: dialogRefMock },
      { provide: DIALOG_DATA, useValue: data },
      provideMockStore({
        initialState: {
          superAdminTournaments: {
            detail,
            deleteRequest: { isLoading: false, error: null },
            statusChangeRequest: { isLoading: false, error: null },
            passwordResetRequest: { isLoading: false, error: null },
            list: { items: [], total: 0, criteria: {}, isLoading: false, error: null },
          },
        },
      }),
    ],
  });

  const store = TestBed.inject(MockStore);
  vi.spyOn(store, 'dispatch');

  const fixture = TestBed.createComponent(SuperAdminTournamentDetailPopupComponent);
  fixture.detectChanges();
  return { fixture, dialogRefMock, store };
}

describe('SuperAdminTournamentDetailPopupComponent', () => {
  it('dispatches loadSuperAdminTournamentDetail with the given id on init', () => {
    const { store } = setup({ data: null, isLoading: true, error: null });
    expect(store.dispatch).toHaveBeenCalledWith(loadSuperAdminTournamentDetail({ id: 'id-1' }));
  });

  it('renders every team and every player once loaded', () => {
    const { fixture } = setup({
      data: {
        id: 'id-1',
        code: 'LAITON-2026',
        name: 'Tournoi Test',
        status: 'ACTIVE',
        createdAt: '2026-01-01',
        teams: [
          {
            id: 't1',
            name: 'Team A',
            players: [
              { id: 'p1', name: 'Alice' },
              { id: 'p2', name: 'Bob' },
            ],
          },
          { id: 't2', name: 'Team B', players: [{ id: 'p3', name: 'Carl' }] },
        ],
      },
      isLoading: false,
      error: null,
    });
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Team A');
    expect(compiled.textContent).toContain('Team B');
    expect(compiled.textContent).toContain('Alice');
    expect(compiled.textContent).toContain('Bob');
    expect(compiled.textContent).toContain('Carl');
  });

  it('dispatches clearSuperAdminTournamentDetail on destroy', () => {
    const { fixture, store } = setup({ data: null, isLoading: false, error: null });
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.destroy();

    expect(store.dispatch).toHaveBeenCalledWith(clearSuperAdminTournamentDetail());
  });
});
