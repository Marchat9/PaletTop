import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TeamDto } from 'src/app/models/team.model';
import { PlayerTeamHeaderComponent } from './player-team-header';

function render(phaseName: string | null) {
  const fixture = TestBed.createComponent(PlayerTeamHeaderComponent);
  fixture.componentRef.setInput('team', { name: 'Les Palets', code: 'AB12' } as TeamDto);
  fixture.componentRef.setInput('tournamentCode', 'ABCD');
  fixture.componentRef.setInput('phaseName', phaseName);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PlayerTeamHeaderComponent', () => {
  it('affiche la phase du tournoi', () => {
    const element = render('Partie 2/5');
    expect(element.querySelector('.phase')?.textContent?.trim()).toBe('Partie 2/5');
  });

  it("n'affiche rien quand la phase est vide", () => {
    const element = render(null);
    expect(element.querySelector('.phase')).toBeNull();
  });
});
