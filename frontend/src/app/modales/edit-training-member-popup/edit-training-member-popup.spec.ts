import { DIALOG_DATA, DialogModule, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  renameTrainingMember,
  setTrainingAdminMember,
} from 'src/app/store/training/training.admin.actions';
import {
  selectRenameTrainingMemberError,
  selectRenameTrainingMemberLoading,
  selectSetTrainingAdminMemberError,
  selectSetTrainingAdminMemberLoading,
} from 'src/app/store/training/training.selectors';
import { EditTrainingMemberPopup, EditTrainingMemberPopupData } from './edit-training-member-popup';

const DATA: EditTrainingMemberPopupData = {
  trainingCode: 'CLUB-1',
  member: { id: 'member-1', name: 'Thomas' },
  isAdminPlayer: false,
};

function setup(error: string | null = null) {
  const dialogRef = { close: vi.fn() } as unknown as DialogRef;

  TestBed.configureTestingModule({
    imports: [DialogModule, EditTrainingMemberPopup],
    providers: [
      { provide: DialogRef, useValue: dialogRef },
      { provide: DIALOG_DATA, useValue: DATA },
      provideMockStore({
        selectors: [
          { selector: selectRenameTrainingMemberLoading, value: false },
          { selector: selectRenameTrainingMemberError, value: error },
          { selector: selectSetTrainingAdminMemberLoading, value: false },
          { selector: selectSetTrainingAdminMemberError, value: null },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(EditTrainingMemberPopup);
  const store = TestBed.inject(MockStore);
  fixture.detectChanges();

  return { fixture, store, dialogRef };
}

describe('EditTrainingMemberPopup', () => {
  it('préremplit le nom actuel et ne permet pas d’enregistrer sans changement', () => {
    const { fixture } = setup();

    expect(fixture.componentInstance.name()).toBe('Thomas');
    expect(fixture.componentInstance.canSubmit()).toBe(false);
  });

  it('renomme le membre avec le nom nettoyé des espaces', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.onNameChange('  Thomas Martin  ');
    fixture.componentInstance.onSubmit();

    expect(dispatchSpy).toHaveBeenCalledWith(
      renameTrainingMember({ code: 'CLUB-1', memberId: 'member-1', name: 'Thomas Martin' }),
    );
  });

  it('enregistre « C’est moi » avec le bouton Enregistrer, sans renommer', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.onAdminPlayerChange(true);
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.canSubmit()).toBe(true);

    fixture.componentInstance.onSubmit();

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(
      setTrainingAdminMember({ code: 'CLUB-1', memberId: 'member-1' }),
    );
  });

  it('n’enregistre rien après « Annuler »', () => {
    const { fixture, store, dialogRef } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.onAdminPlayerChange(true);
    fixture.componentInstance.onCancel();

    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('se ferme une fois le renommage passé', () => {
    const { fixture, store, dialogRef } = setup();

    fixture.componentInstance.onNameChange('Thomas Martin');
    fixture.componentInstance.onSubmit();
    store.overrideSelector(selectRenameTrainingMemberLoading, false);
    store.refreshState();
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  // A homonym is refused by the server: the popup stays open and says why.
  it('reste ouverte et affiche l’erreur du renommage refusé', () => {
    const { fixture, store, dialogRef } = setup();

    fixture.componentInstance.onNameChange('Thomas Durand');
    fixture.componentInstance.onSubmit();
    store.overrideSelector(
      selectRenameTrainingMemberError,
      'Un membre porte déjà ce nom dans ce club.',
    );
    store.refreshState();
    fixture.detectChanges();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(fixture.componentInstance.visibleError()).toBe(
      'Un membre porte déjà ce nom dans ce club.',
    );
  });

  it('n’affiche pas une erreur laissée par un renommage précédent', () => {
    const { fixture } = setup('Un membre porte déjà ce nom dans ce club.');

    expect(fixture.componentInstance.visibleError()).toBeNull();
  });

  it('confie le retrait à la page', () => {
    const { fixture, dialogRef } = setup();

    fixture.componentInstance.onRemove();

    expect(dialogRef.close).toHaveBeenCalledWith('remove');
  });
});
