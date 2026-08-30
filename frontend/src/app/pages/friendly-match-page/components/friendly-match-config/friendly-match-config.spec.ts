import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { FriendlyMatchConfig } from './friendly-match-config';

function findButtonByTitle(root: HTMLElement, title: string): HTMLElement {
  const button = Array.from(root.querySelectorAll<HTMLElement>('app-button')).find((el) =>
    el.textContent?.trim().includes(title),
  );
  if (!button) {
    throw new Error(`No app-button found with title "${title}"`);
  }
  return button.querySelector<HTMLElement>('.button')!;
}

describe('FriendlyMatchConfig', () => {
  it('emits reset when the reset button is clicked and there are modifications', () => {
    const fixture = TestBed.createComponent(FriendlyMatchConfig);
    const resetSpy = vi.fn();
    fixture.componentInstance.reset.subscribe(resetSpy);
    fixture.componentRef.setInput('hasModifications', true);
    fixture.detectChanges();

    findButtonByTitle(fixture.nativeElement, 'Réinitialiser').click();

    expect(resetSpy).toHaveBeenCalled();
  });

  it('disables the reset button when there are no modifications', () => {
    const fixture = TestBed.createComponent(FriendlyMatchConfig);
    const resetSpy = vi.fn();
    fixture.componentInstance.reset.subscribe(resetSpy);
    fixture.detectChanges();

    findButtonByTitle(fixture.nativeElement, 'Réinitialiser').click();

    expect(resetSpy).not.toHaveBeenCalled();
  });
});
