import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import { exactCountPlan } from 'src/app/utils/launch-plan.fixtures';
import { PlanTable } from 'src/app/shared/plan-table/plan-table';
import { TournamentParcours } from './tournament-parcours';

describe('TournamentParcours', () => {
  function create(doneRounds: number, currentRound: number | null) {
    const fixture = TestBed.createComponent(TournamentParcours);
    fixture.componentRef.setInput('plan', exactCountPlan());
    fixture.componentRef.setInput('doneRounds', doneRounds);
    fixture.componentRef.setInput('currentRound', currentRound);
    fixture.detectChanges();
    return fixture;
  }

  it('hands the plan and the progress to the table', () => {
    const table = create(2, 3).debugElement.query(By.directive(PlanTable))
      .componentInstance as PlanTable;

    expect(table.plan()).toEqual(exactCountPlan());
    expect(table.doneRounds()).toBe(2);
    expect(table.currentRound()).toBe(3);
  });

  it('sums up the rounds and the plates', () => {
    const summary = (create(0, null).nativeElement as HTMLElement).querySelector('.summary');

    expect(summary?.textContent?.trim()).toBe('9 tours · 64 plaques');
  });
});
