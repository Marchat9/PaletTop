import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { SuperAdminClubRenamePopupComponent } from './super-admin-club-rename-popup';
import { renameSuperAdminClub } from 'src/app/store/superadmin-clubs/superadmin-clubs.actions';

function setup(renameRequest: { isLoading: boolean; error: string | null }) {
  const dialogRefMock = { close: vi.fn() };
  const data = { id: 'id-1', name: 'Palet Club Nantais' };

  TestBed.configureTestingModule({
    imports: [SuperAdminClubRenamePopupComponent],
    providers: [
      { provide: DialogRef, useValue: dialogRefMock },
      { provide: DIALOG_DATA, useValue: data },
      provideMockStore({
        initialState: {
          superAdminClubs: {
            renameRequest,
            deleteRequest: { isLoading: false, error: null },
            list: { items: [], total: 0, criteria: {}, isLoading: false, error: null },
          },
        },
      }),
    ],
  });

  const store = TestBed.inject(MockStore);
  vi.spyOn(store, 'dispatch');

  const fixture = TestBed.createComponent(SuperAdminClubRenamePopupComponent);
  fixture.detectChanges();
  return { fixture, dialogRefMock, store };
}

describe('SuperAdminClubRenamePopupComponent', () => {
  it('pre-fills the current name and disables confirm until it actually changes', () => {
    const { fixture } = setup({ isLoading: false, error: null });
    expect(fixture.componentInstance.name()).toBe('Palet Club Nantais');
    expect(fixture.componentInstance.canConfirm()).toBe(false);

    fixture.componentInstance.onNameChange('Palet Club Nantais Renamed');
    expect(fixture.componentInstance.canConfirm()).toBe(true);
  });

  it('dispatches renameSuperAdminClub with the trimmed new name on confirm', () => {
    const { fixture, store } = setup({ isLoading: false, error: null });

    fixture.componentInstance.onNameChange('  New Name  ');
    fixture.componentInstance.onConfirm();

    expect(store.dispatch).toHaveBeenCalledWith(
      renameSuperAdminClub({ id: 'id-1', name: 'New Name' }),
    );
  });

  it('shows a 409-style error message when the rename request fails after this popup submits', () => {
    const { fixture } = setup({ isLoading: false, error: 'Un club avec ce nom existe déjà.' });
    fixture.componentInstance.onNameChange('Palet Club Nantais Renamed');
    fixture.componentInstance.onConfirm();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Un club avec ce nom existe déjà.');
  });

  it('does not show a stale error from a previous invocation before this popup submits', () => {
    const { fixture } = setup({ isLoading: false, error: 'Un club avec ce nom existe déjà.' });
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Un club avec ce nom existe déjà.');
  });
});
