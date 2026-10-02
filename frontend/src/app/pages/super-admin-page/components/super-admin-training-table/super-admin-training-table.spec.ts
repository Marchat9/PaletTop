import { TestBed } from '@angular/core/testing';
import { SuperAdminTrainingSummaryDto } from 'src/app/services/super-admin-training.service';
import { SuperAdminTrainingSearchCriteria } from 'src/app/store/superadmin-trainings/superadmin-trainings.actions';
import { SuperAdminTrainingsListState } from 'src/app/store/superadmin-trainings/superadmin-trainings.reducer';
import { SuperAdminTrainingTableComponent } from './super-admin-training-table';

const CRITERIA: SuperAdminTrainingSearchCriteria = {
  page: 1,
  pageSize: 20,
  search: '',
  sortBy: 'createdAt',
  sortDir: 'DESC',
};

const TRAINING_A: SuperAdminTrainingSummaryDto = {
  id: 'id-a',
  code: 'TRAIN-A',
  name: 'Entraînement A',
  sessionsCount: 3,
  openSessionsCount: 1,
  createdAt: '2026-08-01T10:00:00.000Z',
};

const TRAINING_B: SuperAdminTrainingSummaryDto = {
  id: 'id-b',
  code: 'TRAIN-B',
  name: 'Entraînement B',
  sessionsCount: 0,
  openSessionsCount: 0,
  createdAt: '2026-08-02T10:00:00.000Z',
};

function listState(
  items: SuperAdminTrainingSummaryDto[] = [TRAINING_A, TRAINING_B],
): SuperAdminTrainingsListState {
  return { items, total: items.length, criteria: CRITERIA, isLoading: false, error: null };
}

function setup() {
  TestBed.configureTestingModule({ imports: [SuperAdminTrainingTableComponent] });
  const fixture = TestBed.createComponent(SuperAdminTrainingTableComponent);
  fixture.componentRef.setInput('list', listState());
  fixture.detectChanges();
  return { fixture };
}

describe('SuperAdminTrainingTableComponent', () => {
  it('shows the total and open session counts of each training', () => {
    const { fixture } = setup();
    const firstRow = (fixture.nativeElement as HTMLElement).querySelector('tbody tr');
    const cells = Array.from(firstRow!.querySelectorAll('td')).map((td) => td.textContent?.trim());

    expect(cells[2]).toBe('3');
    expect(cells[3]).toBe('1');
  });

  it('emits searchRequested with page 1 and the trimmed term on search input', () => {
    const { fixture } = setup();
    const emitted: SuperAdminTrainingSearchCriteria[] = [];
    fixture.componentInstance.searchRequested.subscribe((criteria) => emitted.push(criteria));

    fixture.componentInstance.onSearchInput('  lundi  ');

    expect(emitted).toEqual([{ ...CRITERIA, page: 1, search: 'lundi' }]);
  });

  it('emits searchRequested with the new sort column', () => {
    const { fixture } = setup();
    const emitted: SuperAdminTrainingSearchCriteria[] = [];
    fixture.componentInstance.searchRequested.subscribe((criteria) => emitted.push(criteria));

    fixture.componentInstance.onSort('sessionsCount');

    expect(emitted).toEqual([{ ...CRITERIA, sortBy: 'sessionsCount', sortDir: 'ASC' }]);
  });

  it('emits searchRequested with the new page on page change', () => {
    const { fixture } = setup();
    const emitted: SuperAdminTrainingSearchCriteria[] = [];
    fixture.componentInstance.searchRequested.subscribe((criteria) => emitted.push(criteria));

    fixture.componentInstance.onPageChange(2);

    expect(emitted).toEqual([{ ...CRITERIA, page: 2 }]);
  });

  it('prunes the selection to ids still present whenever the list input changes', () => {
    const { fixture } = setup();
    fixture.componentInstance.toggleSelectAll(true);
    expect(fixture.componentInstance.selectedCount()).toBe(2);

    fixture.componentRef.setInput('list', listState([TRAINING_B]));
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedCount()).toBe(1);
    expect(fixture.componentInstance.selectedIds().has(TRAINING_B.id)).toBe(true);
  });

  it('emits the row actions with the training', () => {
    const { fixture } = setup();
    const details: string[] = [];
    const resets: SuperAdminTrainingSummaryDto[] = [];
    const deletes: SuperAdminTrainingSummaryDto[] = [];
    fixture.componentInstance.detailRequested.subscribe((id) => details.push(id));
    fixture.componentInstance.passwordResetRequested.subscribe((t) => resets.push(t));
    fixture.componentInstance.deleteOneRequested.subscribe((t) => deletes.push(t));

    fixture.componentInstance.openDetail(TRAINING_A);
    fixture.componentInstance.openPasswordReset(TRAINING_A);
    fixture.componentInstance.deleteOne(TRAINING_B);

    expect(details).toEqual([TRAINING_A.id]);
    expect(resets).toEqual([TRAINING_A]);
    expect(deletes).toEqual([TRAINING_B]);
  });

  it('emits deleteSelectionRequested with the selected ids', () => {
    const { fixture } = setup();
    fixture.componentInstance.toggleSelect(TRAINING_A.id, true);
    const emitted: string[][] = [];
    fixture.componentInstance.deleteSelectionRequested.subscribe((ids) => emitted.push(ids));

    fixture.componentInstance.deleteSelection();

    expect(emitted).toEqual([[TRAINING_A.id]]);
  });
});
