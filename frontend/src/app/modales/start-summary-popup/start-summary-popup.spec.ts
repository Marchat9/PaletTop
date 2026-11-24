import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { exactCountPlan } from 'src/app/utils/launch-plan.fixtures';
import { StartSummaryPopup, StartSummaryPopupData } from './start-summary-popup';

function setup(overrides: Partial<StartSummaryPopupData> = {}) {
  const dialogRef = { close: vi.fn() };
  const data: StartSummaryPopupData = {
    plan: exactCountPlan(6),
    mobile: false,
    notice: null,
    ...overrides,
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: DIALOG_DATA, useValue: data },
      { provide: DialogRef, useValue: dialogRef },
    ],
  });
  const fixture = TestBed.createComponent(StartSummaryPopup);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    Array.from(root.querySelectorAll<HTMLElement>('.actions .button')).find(
      (candidate) => candidate.querySelector('.text')?.textContent?.trim() === label,
    )!;
  return { root, dialogRef, button };
}

describe('StartSummaryPopup', () => {
  it('summarises the tournament, with a card per bracket and no option to pick', () => {
    const { root } = setup();

    expect(root.querySelector('.start-summary__headline')?.textContent).toContain(
      '128 équipes, comme prévu',
    );
    expect(root.querySelectorAll('.bracket-chip')).toHaveLength(6);
    expect(root.querySelector('app-launch-check')).toBeNull();
  });

  it('closes with true on « Démarrer »', () => {
    const { button, dialogRef } = setup();

    button('Démarrer').click();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('closes with false on « Annuler »', () => {
    const { button, dialogRef } = setup();

    button('Annuler').click();

    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('is a bottom sheet on mobile only', () => {
    expect(setup().root.querySelector('.sheet')).toBeNull();
    TestBed.resetTestingModule();

    expect(setup({ mobile: true }).root.querySelector('.sheet .handle')).not.toBeNull();
  });

  it('says why it is shown again', () => {
    const { root } = setup({ notice: "Le nombre d'équipes a changé." });

    expect(root.querySelector('app-inline-notice')?.textContent).toContain(
      "Le nombre d'équipes a changé.",
    );
  });
});
