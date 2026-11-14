import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ApiCallStatus } from 'src/app/models/api-call.model';
import { SuperAdminClubSummaryDto } from 'src/app/services/super-admin-club.service';
import { mergeSuperAdminClubs } from 'src/app/store/superadmin-clubs/superadmin-clubs.actions';
import { selectSuperAdminClubMergeRequest } from 'src/app/store/superadmin-clubs/superadmin-clubs.selectors';
import {
  ClubMergePopupData,
  SuperAdminClubMergePopupComponent,
} from './super-admin-club-merge-popup';

const FIRST: SuperAdminClubSummaryDto = { id: 'id-1', name: 'Palet Club Nantais', playersCount: 3 };
const SECOND: SuperAdminClubSummaryDto = { id: 'id-2', name: 'PaletClub Nantais', playersCount: 1 };

function setup(mergeRequest: ApiCallStatus = { isLoading: false, error: null }) {
  const dialogRefMock = { close: vi.fn() };
  const data: ClubMergePopupData = { first: FIRST, second: SECOND };

  TestBed.configureTestingModule({
    imports: [SuperAdminClubMergePopupComponent],
    providers: [
      { provide: DialogRef, useValue: dialogRefMock },
      { provide: DIALOG_DATA, useValue: data },
      provideMockStore({
        initialState: {
          superAdminClubs: {
            renameRequest: { isLoading: false, error: null },
            deleteRequest: { isLoading: false, error: null },
            mergeRequest,
            list: { items: [], total: 0, criteria: {}, isLoading: false, error: null },
          },
        },
      }),
    ],
  });

  const store = TestBed.inject(MockStore);
  vi.spyOn(store, 'dispatch');

  const fixture = TestBed.createComponent(SuperAdminClubMergePopupComponent);
  fixture.detectChanges();
  return { fixture, dialogRefMock, store };
}

describe('SuperAdminClubMergePopupComponent', () => {
  it('keeps the first club by default and lists both clubs as options', () => {
    const { fixture } = setup();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.keptId()).toBe(FIRST.id);
    expect(compiled.textContent).toContain('Club à conserver');
    expect(compiled.textContent).toContain(FIRST.name);
    expect(compiled.textContent).toContain(SECOND.name);
    expect(compiled.textContent).toContain('Nouveau nom');
    expect(compiled.textContent).toContain('Fusionner');
    expect(compiled.textContent).toContain('Annuler');
  });

  it('merges the unselected club into the kept one', () => {
    const { fixture, store } = setup();

    fixture.componentInstance.onKeptChange(SECOND.id);
    fixture.componentInstance.onConfirm();

    expect(store.dispatch).toHaveBeenCalledWith(
      mergeSuperAdminClubs({ targetId: SECOND.id, sourceId: FIRST.id }),
    );
  });

  it('trims the optional new name', () => {
    const { fixture, store } = setup();

    fixture.componentInstance.onNewNameChange('  Palet Club de Nantes  ');
    fixture.componentInstance.onConfirm();

    expect(store.dispatch).toHaveBeenCalledWith(
      mergeSuperAdminClubs({
        targetId: FIRST.id,
        sourceId: SECOND.id,
        newName: 'Palet Club de Nantes',
      }),
    );
  });

  it('omits a blank new name', () => {
    const { fixture, store } = setup();

    fixture.componentInstance.onNewNameChange('   ');
    fixture.componentInstance.onConfirm();

    const [action] = vi.mocked(store.dispatch).mock.calls[0] as unknown[];
    expect(action).toEqual(mergeSuperAdminClubs({ targetId: FIRST.id, sourceId: SECOND.id }));
    expect(action).not.toHaveProperty('newName');
  });

  it('shows the API error', () => {
    const { fixture } = setup({ isLoading: false, error: 'Un club avec ce nom existe déjà.' });

    fixture.componentInstance.onConfirm();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Un club avec ce nom existe déjà.',
    );
  });

  it('does not show a stale error before this popup submits', () => {
    const { fixture } = setup({ isLoading: false, error: 'Un club avec ce nom existe déjà.' });

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Un club avec ce nom existe déjà.',
    );
  });

  it('closes once the merge succeeds', () => {
    const { fixture, dialogRefMock, store } = setup();

    fixture.componentInstance.onConfirm();
    store.overrideSelector(selectSuperAdminClubMergeRequest, { isLoading: true, error: null });
    store.refreshState();
    fixture.detectChanges();
    expect(dialogRefMock.close).not.toHaveBeenCalled();

    store.overrideSelector(selectSuperAdminClubMergeRequest, { isLoading: false, error: null });
    store.refreshState();
    fixture.detectChanges();
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('closes without merging on cancel', () => {
    const { fixture, dialogRefMock, store } = setup();

    fixture.componentInstance.onCancel();

    expect(dialogRefMock.close).toHaveBeenCalledWith();
    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
