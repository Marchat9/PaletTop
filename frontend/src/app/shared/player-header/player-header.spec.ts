import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PlayerHeader } from './player-header';
import { PlayerHeaderStatus } from './player-header.model';

function render(status: PlayerHeaderStatus | null) {
  const fixture = TestBed.createComponent(PlayerHeader);
  fixture.componentRef.setInput('eyebrow', 'Fiche équipe');
  fixture.componentRef.setInput('title', 'Les Palets');
  fixture.componentRef.setInput('infos', [{ label: 'Code équipe', value: 'AB12', isCode: true }]);
  fixture.componentRef.setInput('status', status);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PlayerHeader', () => {
  it('shows where the player stands', () => {
    const element = render({ label: 'Partie 2/5', tone: 'ongoing' });
    expect(element.querySelector('app-status-pill')?.textContent?.trim()).toBe('Partie 2/5');
  });

  it('shows no status when there is none', () => {
    expect(render(null).querySelector('app-status-pill')).toBeNull();
  });

  it('lists the codes of the player', () => {
    expect(render(null).querySelector('.info.is-code .info-value')?.textContent).toBe('AB12');
  });
});
