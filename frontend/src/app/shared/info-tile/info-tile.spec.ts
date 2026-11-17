import { TestBed } from '@angular/core/testing';
import { InfoTile } from './info-tile';

describe('InfoTile', () => {
  it('shows what the information is and its value', () => {
    const fixture = TestBed.createComponent(InfoTile);
    fixture.componentRef.setInput('icon', 'event');
    fixture.componentRef.setInput('label', 'Date du tournoi');
    fixture.componentRef.setInput('value', '17/11/2026');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.label')?.textContent).toBe('Date du tournoi');
    expect(element.querySelector('.value')?.textContent).toBe('17/11/2026');
  });
});
