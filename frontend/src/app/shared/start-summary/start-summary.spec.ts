import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { exactCountPlan } from 'src/app/utils/launch-plan.fixtures';
import { StartSummary } from './start-summary';

describe('StartSummary', () => {
  let fixture: ComponentFixture<StartSummary>;

  function create(bracketCount = 3): HTMLElement {
    fixture = TestBed.createComponent(StartSummary);
    fixture.componentRef.setInput('plan', exactCountPlan(bracketCount));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const text = (el: Element | null | undefined): string => {
    const copy = el?.cloneNode(true) as Element | undefined;
    copy?.querySelectorAll('app-icon').forEach((icon) => icon.remove());
    return (copy?.textContent ?? '').replace(/\s+/g, ' ').trim();
  };

  it('says the count is the planned one', () => {
    expect(text(create().querySelector('.start-summary__headline'))).toBe(
      '128 équipes, comme prévu',
    );
  });

  it('shows one card per bracket, three per row', () => {
    const root = create(6);

    expect(root.querySelectorAll('.bracket-chip')).toHaveLength(6);
    expect((root.querySelector('.bracket-chips') as HTMLElement).style.gridTemplateColumns).toBe(
      'repeat(3, minmax(0, 1fr))',
    );
  });

  it('shows the rounds and the plates as two big figures', () => {
    const figures = Array.from(create().querySelectorAll('.start-summary__figure')).map(
      (figure) => `${text(figure.querySelector('b'))} ${text(figure.querySelector('span'))}`,
    );

    expect(figures).toEqual(['9 tours', '64 plaques']);
  });

  it('folds the round by round table until asked for, then folds it back', () => {
    const root = create();
    const toggle = () => root.querySelector('.start-summary__toggle .button') as HTMLElement;
    expect(root.querySelector('app-plan-table')).toBeNull();
    expect(text(toggle())).toBe('Voir le parcours tour par tour');

    toggle().click();
    fixture.detectChanges();
    expect(root.querySelector('app-plan-table')).not.toBeNull();
    expect(text(toggle())).toBe('Masquer le parcours');

    toggle().click();
    fixture.detectChanges();
    expect(root.querySelector('app-plan-table')).toBeNull();
  });
});
