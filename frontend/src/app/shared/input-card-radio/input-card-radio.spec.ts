import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { InputCardRadio, InputCardRadioOption } from './input-card-radio';

const OPTIONS: InputCardRadioOption<string>[] = [
  { value: 'dutch', label: 'Gagnant/Perdant', recommended: true },
  { value: 'random', label: 'Aléatoire' },
];

function setup() {
  TestBed.configureTestingModule({ imports: [InputCardRadio] });
  const fixture = TestBed.createComponent(InputCardRadio<string>);
  fixture.componentRef.setInput('options', OPTIONS);
  fixture.detectChanges();
  return { fixture };
}

describe('InputCardRadio', () => {
  it('shows the recommended badge only on the recommended options', () => {
    const { fixture } = setup();
    const cards: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.card-radio-button'),
    );

    expect(cards[0].querySelector('.card-radio-badge')?.textContent).toContain('Recommandé');
    expect(cards[1].querySelector('.card-radio-badge')).toBeNull();
  });

  it('passes the number of columns to the grid', () => {
    const { fixture } = setup();
    fixture.componentRef.setInput('columns', 3);
    fixture.detectChanges();
    const group: HTMLElement = fixture.nativeElement.querySelector('.card-radio-group');

    expect(group.style.getPropertyValue('--card-radio-columns')).toBe('3');
  });
});
