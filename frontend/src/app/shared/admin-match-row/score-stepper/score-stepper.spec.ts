import { TestBed } from '@angular/core/testing';
import { ScoreStepper } from './score-stepper';

function render(value: number) {
  const fixture = TestBed.createComponent(ScoreStepper);
  fixture.componentRef.setInput('value', value);
  fixture.componentRef.setInput('max', 13);
  fixture.componentRef.setInput('teamName', 'Les Vendéens');
  fixture.detectChanges();
  const emitted: number[] = [];
  fixture.componentInstance.valueChange.subscribe((next) => emitted.push(next));
  return {
    stepper: fixture.componentInstance,
    buttons: (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    emitted,
  };
}

describe('ScoreStepper', () => {
  it('adds and removes one point', () => {
    const { buttons, emitted } = render(9);

    buttons[1].click();
    buttons[0].click();

    expect(emitted).toEqual([10, 8]);
  });

  it('keeps the score between 0 and the points per game', () => {
    const { stepper, emitted } = render(5);

    stepper.set(20);
    stepper.set(-3);

    expect(emitted).toEqual([13, 0]);
  });

  it('disables − at 0 and + at the points per game, with the team in the button names', () => {
    const atZero = render(0).buttons;
    expect(atZero[0].disabled).toBe(true);
    expect(atZero[0].getAttribute('aria-label')).toBe('Retirer un point à Les Vendéens');

    TestBed.resetTestingModule();
    expect(render(13).buttons[1].disabled).toBe(true);
  });
});
