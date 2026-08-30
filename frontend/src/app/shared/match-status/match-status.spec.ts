import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MatchStatusComponent } from './match-status';

function setup(status: string) {
  TestBed.configureTestingModule({ imports: [MatchStatusComponent] });
  const fixture = TestBed.createComponent(MatchStatusComponent);
  fixture.componentRef.setInput('status', status);
  fixture.detectChanges();
  return { fixture };
}

describe('MatchStatusComponent', () => {
  it.each([
    ['PENDING', 'En attente'],
    ['ONGOING', 'En cours'],
    ['ENDED', 'En validation'],
    ['VALIDATED', 'Validé'],
  ])('renders the French label for status %s', (status, label) => {
    const { fixture } = setup(status);
    expect(fixture.nativeElement.textContent.trim()).toBe(label);
  });
});
