import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PlayerParcoursStep } from 'src/app/utils/player-parcours.util';
import { PlayerParcours } from './player-parcours';

const STEPS: PlayerParcoursStep[] = [
  { key: 'qualifying', state: 'done', text: 'Qualifs : 2 victoires, 2 défaites' },
  { key: 'elimination-5', state: 'current', text: 'Élim. 1 · Consolante B · plaque 49' },
];

describe('PlayerParcours', () => {
  it('lists the steps and highlights the one in progress', () => {
    const fixture = TestBed.createComponent(PlayerParcours);
    fixture.componentRef.setInput('steps', STEPS);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.title')?.textContent).toBe('Mon parcours');
    const steps = Array.from(root.querySelectorAll('.step'));
    expect(steps.map((step) => step.querySelector('.step-text')?.textContent)).toEqual(
      STEPS.map((step) => step.text),
    );
    expect(steps.map((step) => step.classList.contains('current'))).toEqual([false, true]);
  });
});
