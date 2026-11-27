import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';
import { InfoTile } from 'src/app/shared/info-tile/info-tile';
import { InlineNotice } from 'src/app/shared/inline-notice/inline-notice';
import { InputCheckbox } from 'src/app/shared/input-checkbox/input-checkbox';
import { ConfirmationData, ConfirmationPopupComponent } from './confirmation-popup';

function setup(extra: Partial<ConfirmationData> = {}) {
  const dialogRef = { close: vi.fn() };
  const data: ConfirmationData = { title: 'Titre', message: 'Message', ...extra };
  TestBed.configureTestingModule({
    imports: [ConfirmationPopupComponent],
    providers: [
      { provide: DialogRef, useValue: dialogRef },
      { provide: DIALOG_DATA, useValue: data },
    ],
  });
  const fixture = TestBed.createComponent(ConfirmationPopupComponent);
  fixture.detectChanges();
  const tickBox = () =>
    fixture.debugElement
      .query(By.directive(InputCheckbox))
      .componentInstance.checkedChange.emit(true);
  return { fixture, dialogRef, tickBox };
}

describe('ConfirmationPopupComponent', () => {
  it('shows no checkbox, tile nor notice by default', () => {
    const { fixture } = setup();

    expect(fixture.debugElement.query(By.directive(InputCheckbox))).toBeNull();
    expect(fixture.debugElement.query(By.directive(InfoTile))).toBeNull();
    expect(fixture.debugElement.query(By.directive(InlineNotice))).toBeNull();
  });

  it('renders the info tile and the notice when given', () => {
    const { fixture } = setup({
      info: { icon: 'route', label: 'Round 4 sur 7', value: 'Quarts de finale' },
      notice: 'Fin des qualifications.',
    });
    const text = fixture.nativeElement.textContent;

    expect(fixture.debugElement.query(By.directive(InfoTile))).not.toBeNull();
    expect(text).toContain('Round 4 sur 7');
    expect(text).toContain('Quarts de finale');
    expect(text).toContain('Fin des qualifications.');
  });

  it('calls onDontAskAgain then closes with true when confirmed with the box ticked', () => {
    const onDontAskAgain = vi.fn();
    const { fixture, dialogRef, tickBox } = setup({
      dontAskAgainLabel: 'Ne plus demander pour ce tournoi',
      onDontAskAgain,
    });
    expect(fixture.nativeElement.textContent).toContain('Ne plus demander pour ce tournoi');

    tickBox();
    fixture.componentInstance.onConfirm();

    expect(onDontAskAgain).toHaveBeenCalledTimes(1);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('does not call onDontAskAgain when cancelled with the box ticked', () => {
    const onDontAskAgain = vi.fn();
    const { fixture, dialogRef, tickBox } = setup({ dontAskAgainLabel: 'Ne plus', onDontAskAgain });

    tickBox();
    fixture.componentInstance.onCancel();

    expect(onDontAskAgain).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('does not call onDontAskAgain when confirmed with the box unticked', () => {
    const onDontAskAgain = vi.fn();
    const { fixture, dialogRef } = setup({ dontAskAgainLabel: 'Ne plus', onDontAskAgain });

    fixture.componentInstance.onConfirm();

    expect(onDontAskAgain).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});
