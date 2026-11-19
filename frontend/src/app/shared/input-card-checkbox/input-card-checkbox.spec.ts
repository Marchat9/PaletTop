import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { InputCardCheckbox } from './input-card-checkbox';

describe('InputCardCheckbox', () => {
  let fixture: ComponentFixture<InputCardCheckbox<string>>;
  let component: InputCardCheckbox<string>;
  let emitted: string[][];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InputCardCheckbox] });
    fixture = TestBed.createComponent(InputCardCheckbox<string>);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
      { value: 'c', label: 'C' },
    ]);
    fixture.componentRef.setInput('minSelected', 1);
    emitted = [];
    component.valueChange.subscribe((value) => emitted.push(value));
  });

  function clickCard(index: number): void {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    (buttons[index] as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('adds a card in the options order', () => {
    fixture.componentRef.setInput('value', ['c']);
    fixture.detectChanges();

    clickCard(0);

    expect(emitted).toEqual([['a', 'c']]);
  });

  it('removes a selected card', () => {
    fixture.componentRef.setInput('value', ['a', 'b']);
    fixture.detectChanges();

    clickCard(1);

    expect(emitted).toEqual([['a']]);
  });

  it('never unselects the last card below the minimum', () => {
    fixture.componentRef.setInput('value', ['b']);
    fixture.detectChanges();

    clickCard(1);

    expect(emitted).toEqual([]);
    const lockedCards = fixture.nativeElement.querySelectorAll('button.locked');
    expect(lockedCards.length).toBe(1);
  });
});
