import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { TeamConfigEvent } from 'src/app/models/team-config.model';
import { TeamForm } from './team-form';

function championshipTournament(): TournamentDto {
  return {
    teams: [],
    configuration: {
      competitionMode: 'championship',
      competitionConfiguration: { homeClub: 'Home', awayClub: 'Away' },
    },
  } as unknown as TournamentDto;
}

function render(tournament: TournamentDto | null = null) {
  const fixture = TestBed.createComponent(TeamForm);
  fixture.componentRef.setInput('tournament', tournament);
  fixture.detectChanges();
  const emitted: TeamConfigEvent[] = [];
  fixture.componentInstance.submitted.subscribe((e) => emitted.push(e));
  const root = fixture.nativeElement as HTMLElement;
  const playerInput = (i: number) =>
    root.querySelector(`#${fixture.componentInstance.formId}-player-name-${i}`) as HTMLInputElement;
  const errorText = (id: string) => root.querySelector(`#${id}`)?.textContent?.trim() ?? null;
  const submitButton = () => {
    const buttons = Array.from(root.querySelectorAll('app-button .button')) as HTMLElement[];
    return buttons[buttons.length - 1];
  };
  return { fixture, component: fixture.componentInstance, root, emitted, playerInput, errorText, submitButton };
}

describe('TeamForm validation', () => {
  it('shows no error before blur or submit', () => {
    const { component } = render();
    expect(component.playerErrors()).toEqual([null]);
    expect(component.clubError()).toBeNull();
  });

  it('shows the player error after blur', () => {
    const { fixture, component, playerInput, errorText } = render();
    playerInput(0).dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(component.playerErrors()[0]).toBe('Renseignez le nom du joueur 1, ou retirez la ligne.');
    expect(errorText(`${component.formId}-player-error-0`)).toBe(
      'Renseignez le nom du joueur 1, ou retirez la ligne.',
    );
    expect(playerInput(0).getAttribute('aria-invalid')).toBe('true');
    expect(playerInput(0).getAttribute('aria-describedby')).toBe(`${component.formId}-player-error-0`);
  });

  it('shows all errors after a submit attempt and does not emit', () => {
    const { fixture, component, emitted, submitButton } = render();
    component.addPlayerRow();
    fixture.detectChanges();
    expect(submitButton().getAttribute('aria-disabled')).toBe('false');
    submitButton().click();
    fixture.detectChanges();
    expect(emitted).toEqual([]);
    expect(component.submitAttempted()).toBe(true);
    expect(component.playerErrors().every((e) => !!e)).toBe(true);
  });

  it('shows the club error in championship after a submit attempt', () => {
    const { fixture, component, emitted, errorText, submitButton } = render(championshipTournament());
    component.updatePlayerName(0, 'Alice');
    fixture.detectChanges();
    expect(component.clubError()).toBeNull();
    submitButton().click();
    fixture.detectChanges();
    expect(emitted).toEqual([]);
    expect(component.clubError()).toBe("Choisissez le club pour créer l'équipe.");
    expect(errorText(`${component.formId}-club-error`)).toBe("Choisissez le club pour créer l'équipe.");
  });

  it('resets errors and keeps the player-row count after a creation', () => {
    const { fixture, component, emitted, submitButton } = render();
    component.addPlayerRow();
    component.updatePlayerName(0, 'Alice');
    component.updatePlayerName(1, 'Bob');
    fixture.detectChanges();
    submitButton().click();
    fixture.detectChanges();
    expect(emitted.length).toBe(1);
    expect(component.teamPlayers().length).toBe(2);
    expect(component.submitAttempted()).toBe(false);
    expect(component.touchedPlayers().size).toBe(0);
    expect(component.playerErrors()).toEqual([null, null]);
  });

  it('shifts touched indices when a player row is removed', () => {
    const { fixture, component, playerInput } = render();
    component.addPlayerRow();
    component.addPlayerRow();
    fixture.detectChanges();
    playerInput(0).dispatchEvent(new Event('blur'));
    playerInput(2).dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect([...component.touchedPlayers()].sort()).toEqual([0, 2]);
    component.removePlayerRow(1);
    fixture.detectChanges();
    expect([...component.touchedPlayers()].sort()).toEqual([0, 1]);
  });
});
