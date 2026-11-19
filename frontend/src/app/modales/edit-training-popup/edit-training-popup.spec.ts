import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { updateTrainingAdministratorInformations } from 'src/app/store/training/training.admin.actions';
import {
  selectUpdateTrainingError,
  selectUpdateTrainingLoading,
} from 'src/app/store/training/training.selectors';
import { EditTrainingPopup } from './edit-training-popup';

function render() {
  const dialogRef = { close: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideMockStore({
        selectors: [
          { selector: selectUpdateTrainingLoading, value: false },
          { selector: selectUpdateTrainingError, value: null },
        ],
      }),
      { provide: DialogRef, useValue: dialogRef },
      { provide: DIALOG_DATA, useValue: { code: 'CLUB', name: 'Club', description: 'Jeudi' } },
    ],
  });
  const store = TestBed.inject(MockStore);
  const dispatch = vi.spyOn(store, 'dispatch');
  const fixture = TestBed.createComponent(EditTrainingPopup);
  fixture.detectChanges();
  const setRequest = (loading: boolean, error: string | null) => {
    selectUpdateTrainingLoading.setResult(loading);
    selectUpdateTrainingError.setResult(error);
    store.refreshState();
    fixture.detectChanges();
  };
  return { fixture, popup: fixture.componentInstance, dialogRef, dispatch, setRequest };
}

describe('EditTrainingPopup', () => {
  afterEach(() => {
    selectUpdateTrainingLoading.release();
    selectUpdateTrainingError.release();
  });

  it('sends the trimmed name and description', () => {
    const { popup, dispatch } = render();

    popup.onNameChange('  Club du jeudi  ');
    popup.onDescriptionChange('  ');
    popup.onSubmit();

    expect(dispatch).toHaveBeenCalledWith(
      updateTrainingAdministratorInformations({
        code: 'CLUB',
        name: 'Club du jeudi',
        description: undefined,
      }),
    );
  });

  it('closes once the update succeeded', () => {
    const { popup, dialogRef, setRequest } = render();

    popup.onSubmit();
    setRequest(true, null);
    expect(dialogRef.close).not.toHaveBeenCalled();

    setRequest(false, null);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('stays open when the update failed', () => {
    const { popup, dialogRef, setRequest } = render();

    popup.onSubmit();
    setRequest(true, null);
    setRequest(false, 'Erreur serveur');

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('does not close before anything was submitted', () => {
    const { dialogRef, setRequest } = render();

    setRequest(false, null);

    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
