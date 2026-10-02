import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { SuperAdminTrainingDetailPopupComponent } from './super-admin-training-detail-popup';
import {
  clearSuperAdminTrainingDetail,
  loadSuperAdminTrainingDetail,
} from 'src/app/store/superadmin-trainings/superadmin-trainings.actions';

function setup(detail: { data: any; isLoading: boolean; error: string | null }) {
  const dialogRefMock = { close: vi.fn() };

  TestBed.configureTestingModule({
    imports: [SuperAdminTrainingDetailPopupComponent],
    providers: [
      { provide: DialogRef, useValue: dialogRefMock },
      { provide: DIALOG_DATA, useValue: { id: 'id-1' } },
      provideMockStore({ initialState: { superAdminTrainings: { detail } } }),
    ],
  });

  const store = TestBed.inject(MockStore);
  vi.spyOn(store, 'dispatch');

  const fixture = TestBed.createComponent(SuperAdminTrainingDetailPopupComponent);
  fixture.detectChanges();
  return { fixture, dialogRefMock, store };
}

describe('SuperAdminTrainingDetailPopupComponent', () => {
  it('dispatches loadSuperAdminTrainingDetail with the given id on init', () => {
    const { store } = setup({ data: null, isLoading: true, error: null });
    expect(store.dispatch).toHaveBeenCalledWith(loadSuperAdminTrainingDetail({ id: 'id-1' }));
  });

  it('renders members and sessions once loaded', () => {
    const { fixture } = setup({
      data: {
        id: 'id-1',
        code: 'TRAIN-1',
        name: 'Entraînement du lundi',
        createdAt: '2026-01-01',
        members: [
          { id: 'm1', name: 'Alice' },
          { id: 'm2', name: 'Bob' },
        ],
        sessions: [
          { code: 'S-OPEN', date: '2026-02-01', status: 'OPEN', participantsCount: 6 },
          { code: 'S-CLOSED', date: '2026-01-15', status: 'CLOSED', participantsCount: 8 },
        ],
      },
      isLoading: false,
      error: null,
    });
    const text = (fixture.nativeElement as HTMLElement).textContent;

    expect(text).toContain('Entraînement du lundi');
    expect(text).toContain('Alice');
    expect(text).toContain('Bob');
    expect(text).toContain('S-OPEN');
    expect(text).toContain('Ouverte');
    expect(text).toContain('Clôturée');
  });

  it('dispatches clearSuperAdminTrainingDetail on destroy', () => {
    const { fixture, store } = setup({ data: null, isLoading: false, error: null });
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.destroy();

    expect(store.dispatch).toHaveBeenCalledWith(clearSuperAdminTrainingDetail());
  });
});
