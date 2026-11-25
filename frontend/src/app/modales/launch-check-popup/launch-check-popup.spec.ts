import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { fewerTeamsPlan, impossiblePlan } from 'src/app/utils/launch-plan.fixtures';
import { LaunchCheckPopup, LaunchCheckPopupData } from './launch-check-popup';

function setup(overrides: Partial<LaunchCheckPopupData> = {}) {
  const dialogRef = { close: vi.fn() };
  const data: LaunchCheckPopupData = {
    plan: fewerTeamsPlan(),
    registeredCount: 117,
    targetCount: 128,
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
  const fixture = TestBed.createComponent(LaunchCheckPopup);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const text = (el: Element | null | undefined): string => {
    const copy = el?.cloneNode(true) as Element | undefined;
    copy?.querySelectorAll('app-icon').forEach((icon) => icon.remove());
    return (copy?.textContent ?? '').replace(/\s+/g, ' ').trim();
  };
  return {
    fixture,
    root,
    dialogRef,
    text,
    cards: () => Array.from(root.querySelectorAll<HTMLElement>('.option-card')),
    footerButton: (label: string) =>
      Array.from(root.querySelectorAll<HTMLElement>('.launch-check-popup__footer .button')).find(
        (button) => text(button) === label,
      ),
    sheet: () => root.querySelector('.route-sheet'),
    sheetButton: (label: string) =>
      Array.from(root.querySelectorAll<HTMLElement>('.route-sheet__footer .button')).find(
        (button) => text(button) === label,
      ),
  };
}

describe('LaunchCheckPopup', () => {
  it('lists the options of the plan: keep, recalculate, stop the last ones', () => {
    const { cards, text } = setup();

    expect(cards().map((card) => text(card.querySelector('.option-card__title')))).toEqual([
      'Garder ma configuration',
      'Passer à 2 tableaux',
      'Arrêter les 5 derniers après les qualifs',
    ]);
  });

  it('keeps « Lancer » disabled until an option is chosen', () => {
    const { fixture, cards, footerButton, dialogRef } = setup();
    const launch = () => footerButton('Lancer avec cette configuration')!;
    expect(launch().classList.contains('disabled')).toBe(true);

    launch().click();
    expect(dialogRef.close).not.toHaveBeenCalled();

    cards()[1].click();
    fixture.detectChanges();
    expect(launch().classList.contains('disabled')).toBe(false);
  });

  it('never launches an impossible plan', () => {
    const { fixture, cards, footerButton, dialogRef } = setup({
      plan: impossiblePlan(),
      registeredCount: 3,
    });

    cards()[0].click();
    fixture.detectChanges();
    const launch = footerButton('Lancer avec cette configuration')!;
    expect(launch.classList.contains('disabled')).toBe(true);
    launch.click();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with the option chosen', () => {
    const { fixture, cards, footerButton, dialogRef } = setup();

    cards()[2].click();
    fixture.detectChanges();
    footerButton('Lancer avec cette configuration')!.click();

    expect(dialogRef.close).toHaveBeenCalledWith('stop_last');
  });

  it('asks for the confirmation of an option with a nearly empty bracket before it launches', () => {
    const { fixture, root, cards, footerButton, dialogRef } = setup();
    const launch = () => footerButton('Lancer avec cette configuration')!;

    cards()[0].click();
    fixture.detectChanges();
    expect(launch().classList.contains('disabled')).toBe(true);
    launch().click();
    expect(dialogRef.close).not.toHaveBeenCalled();

    const switchInput = root.querySelector('app-switch input') as HTMLInputElement;
    switchInput.checked = true;
    switchInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(launch().classList.contains('disabled')).toBe(false);
    launch().click();

    expect(dialogRef.close).toHaveBeenCalledWith('keep');
  });

  it('forgets the confirmation when another option is chosen', () => {
    const { fixture, root, cards, footerButton } = setup();
    cards()[0].click();
    fixture.detectChanges();
    const switchInput = root.querySelector('app-switch input') as HTMLInputElement;
    switchInput.checked = true;
    switchInput.dispatchEvent(new Event('change'));

    cards()[2].click();
    fixture.detectChanges();
    cards()[0].click();
    fixture.detectChanges();

    expect(footerButton('Lancer avec cette configuration')!.classList.contains('disabled')).toBe(
      true,
    );
  });

  it('closes with nothing on « Annuler »', () => {
    const { footerButton, dialogRef } = setup();

    footerButton('Annuler')!.click();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('shows why the check is shown again', () => {
    const { root, text } = setup({ notice: "Le nombre d'équipes a changé." });

    expect(text(root.querySelector('.launch-check-popup__body app-inline-notice'))).toBe(
      "Le nombre d'équipes a changé.",
    );
  });

  describe('on mobile', () => {
    it('only draws the second sheet once a route is viewed', () => {
      const { fixture, root, sheet, text } = setup({ mobile: true });
      expect(sheet()).toBeNull();

      root.querySelectorAll<HTMLElement>('.option-card .button')[1].click();
      fixture.detectChanges();

      expect(sheet()).not.toBeNull();
      expect(text(root.querySelector('.route-sheet__name'))).toBe('Passer à 2 tableaux');
      expect(root.querySelector('.route-sheet app-plan-table')).not.toBeNull();
    });

    it('goes back from the route without choosing anything', () => {
      const { fixture, root, sheet, sheetButton, footerButton } = setup({ mobile: true });
      root.querySelector<HTMLElement>('.option-card .button')?.click();
      fixture.detectChanges();

      sheetButton('Retour')!.click();
      fixture.detectChanges();

      expect(sheet()).toBeNull();
      expect(footerButton('Lancer')!.classList.contains('disabled')).toBe(true);
    });

    it('chooses the option of the route it shows', () => {
      const { fixture, root, sheet, sheetButton, footerButton, cards, dialogRef } = setup({
        mobile: true,
      });
      root.querySelectorAll<HTMLElement>('.option-card .button')[2].click();
      fixture.detectChanges();

      sheetButton('Choisir cette option')!.click();
      fixture.detectChanges();

      expect(sheet()).toBeNull();
      expect(cards()[2].getAttribute('aria-checked')).toBe('true');
      footerButton('Lancer')!.click();
      expect(dialogRef.close).toHaveBeenCalledWith('stop_last');
    });

    it('never draws the second sheet on desktop', () => {
      const { root, sheet } = setup({ mobile: false });

      expect(root.querySelector('.option-card .button')).toBeNull();
      expect(sheet()).toBeNull();
    });
  });
});
