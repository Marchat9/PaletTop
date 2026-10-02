import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { PlayerMatchView } from 'src/app/models/player-match-view.model';
import { PlayerMatchCard } from './player-match-card';

function buildMatch(overrides: Partial<PlayerMatchView> = {}): PlayerMatchView {
  return {
    id: 'm1',
    status: 'ONGOING',
    isBye: false,
    myLabel: 'Jean · Marie',
    opponentLabel: 'Luc · Claire',
    myScore: 0,
    opponentScore: 0,
    iAmTeamA: true,
    startedAt: null,
    finishedAt: null,
    subtitle: 'Partie 3',
    ...overrides,
  };
}

function setup(match: PlayerMatchView | null, inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(PlayerMatchCard);
  fixture.componentRef.setInput('match', match);
  fixture.componentRef.setInput('pointsPerGame', 13);
  Object.entries(inputs).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<PlayerMatchCard>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** The "+" of the first `app-score-number` of the card, that is, my score. */
function incrementMyScore(fixture: ComponentFixture<PlayerMatchCard>): void {
  element(fixture).querySelector<HTMLElement>('#my-score .increment-button')!.click();
  fixture.detectChanges();
}

describe('PlayerMatchCard', () => {
  it('émet les deux scores dans le sens du joueur', () => {
    const fixture = setup(buildMatch({ myScore: 4, opponentScore: 7 }));
    const emitted = vi.fn();
    fixture.componentInstance.scoreChange.subscribe(emitted);

    incrementMyScore(fixture);

    expect(emitted).toHaveBeenCalledWith({ myScore: 5, opponentScore: 7 });
  });

  it('ouvre la validation dès que le score cible est atteint, sans attendre le serveur', () => {
    const fixture = setup(buildMatch({ myScore: 12, opponentScore: 9 }));

    expect(element(fixture).querySelector('.match-card__validate')).toBeNull();

    incrementMyScore(fixture);

    expect(element(fixture).querySelector('.match-card__validate')).not.toBeNull();
  });

  it('propose de démarrer un match qui ne l’est pas encore', () => {
    const fixture = setup(buildMatch({ status: 'PENDING' }));
    const started = vi.fn();
    fixture.componentInstance.startMatch.subscribe(started);

    element(fixture).querySelector<HTMLElement>('.match-card__action .button')!.click();

    expect(started).toHaveBeenCalled();
  });

  it('retire le démarrage quand l’épreuve est close', () => {
    const fixture = setup(buildMatch({ status: 'PENDING' }), { scoringLocked: true });

    expect(element(fixture).querySelector('.match-card__action')).toBeNull();
  });

  it('fige la saisie du score quand l’épreuve est close', () => {
    const fixture = setup(buildMatch({ myScore: 4, opponentScore: 7 }), { scoringLocked: true });
    const emitted = vi.fn();
    fixture.componentInstance.scoreChange.subscribe(emitted);

    incrementMyScore(fixture);

    expect(emitted).not.toHaveBeenCalled();
  });

  it('laisse valider un score déjà enregistré même une fois l’épreuve close', () => {
    const fixture = setup(buildMatch({ status: 'ENDED', myScore: 13, opponentScore: 9 }), {
      scoringLocked: true,
    });
    const validated = vi.fn();
    fixture.componentInstance.validateMatch.subscribe(validated);

    const input = element(fixture).querySelector<HTMLInputElement>('.validate-form input')!;
    input.value = '4821';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    element(fixture).querySelector<HTMLElement>('.match-card__validate .button')!.click();

    expect(validated).toHaveBeenCalledWith('4821');
  });

  // Enter (desktop or mobile keyboard) validates, just like pressing the button.
  it('valide au clavier avec la touche Entrée quand le code est complet', () => {
    const fixture = setup(buildMatch({ status: 'ENDED', myScore: 13, opponentScore: 9 }), {
      scoringLocked: true,
    });
    const validated = vi.fn();
    fixture.componentInstance.validateMatch.subscribe(validated);

    const form = element(fixture).querySelector<HTMLElement>('.validate-form')!;
    const input = form.querySelector<HTMLInputElement>('input')!;

    // Incomplete code: Enter does nothing (the button would be disabled).
    input.value = '12';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    form.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(validated).not.toHaveBeenCalled();

    // Complete code: Enter validates.
    input.value = '4821';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    form.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(validated).toHaveBeenCalledWith('4821');
  });

  it('annonce le repos sans proposer de score', () => {
    const fixture = setup(buildMatch({ isBye: true, status: 'PENDING' }), {
      byeCopy: { title: 'Au repos', message: 'Vous ne jouez pas cette partie.' },
    });

    expect(element(fixture).textContent).toContain('Au repos');
    expect(element(fixture).querySelector('.match-card__scoreboard')).toBeNull();
  });

  it('garde sa boîte pour accueillir l’état fourni par la page', () => {
    const fixture = setup(null);

    expect(element(fixture).querySelector('.match-card')).toBeNull();
    expect(element(fixture).querySelector('.match-card-empty')).not.toBeNull();
  });

  it('habille la boîte en fin d’épreuve', () => {
    const fixture = setup(null, { emptyTone: 'celebration' });

    expect(element(fixture).querySelector('.match-card-empty--celebration')).not.toBeNull();
  });
});
