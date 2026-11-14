import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SessionActions } from './session-actions';

function setup(closeError: string | null) {
  const fixture = TestBed.createComponent(SessionActions);
  fixture.componentRef.setInput('isSessionOpen', true);
  fixture.componentRef.setInput('closeError', closeError);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('SessionActions', () => {
  it('explique sous la barre pourquoi la clôture a été refusée', () => {
    const element = setup("Le round 2 n'est pas terminé.");

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      "Le round 2 n'est pas terminé.",
    );
  });

  it("n'affiche rien tant que la clôture n'a pas été refusée", () => {
    expect(setup(null).querySelector('[role="alert"]')).toBeNull();
  });
});
