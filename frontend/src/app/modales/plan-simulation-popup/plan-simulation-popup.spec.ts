import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { Nullable } from 'src/app/models/nullable.model';
import { TournamentPlan } from 'src/app/models/tournament-plan.model';
import { PlanSimulationPopup, PlanSimulationPopupData } from './plan-simulation-popup';

function setup(initialTeamCount: Nullable<number> = null) {
  const teamCount = signal<Nullable<number>>(initialTeamCount);
  const changeTeamCount = vi.fn((count: number) => teamCount.set(count));
  const dialogRef = { close: vi.fn() };
  const data: PlanSimulationPopupData = {
    targetCount: 96,
    plan: signal<TournamentPlan | null>(null),
    teamCount,
    error: signal<Nullable<string>>(null),
    changeTeamCount,
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: DIALOG_DATA, useValue: data },
      { provide: DialogRef, useValue: dialogRef },
    ],
  });
  const fixture = TestBed.createComponent(PlanSimulationPopup);
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement, changeTeamCount, dialogRef };
}

describe('PlanSimulationPopup', () => {
  it('starts from the target count while the slider has not moved', () => {
    const { root } = setup();
    expect(root.querySelector('.plan-simulation__count')?.textContent).toBe('96');
  });

  it('shows the simulated count the page holds', () => {
    const { root } = setup(110);
    expect(root.querySelector('.plan-simulation__count')?.textContent).toBe('110');
  });

  it('reports the slider to the page and shows the new count', () => {
    const { fixture, root, changeTeamCount } = setup();

    (root.querySelector('[aria-label="Une équipe de plus"]') as HTMLElement).click();
    fixture.detectChanges();

    expect(changeTeamCount).toHaveBeenCalledWith(97);
    expect(root.querySelector('.plan-simulation__count')?.textContent).toBe('97');
  });

  it('closes with the close button', () => {
    const { root, dialogRef } = setup();
    (root.querySelector('.popup-close') as HTMLElement).click();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
