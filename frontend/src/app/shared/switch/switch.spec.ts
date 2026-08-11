import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Switch } from './switch';

function setup(checked = false) {
  TestBed.configureTestingModule({ imports: [Switch] });
  const fixture = TestBed.createComponent(Switch);
  fixture.componentRef.setInput('checked', checked);
  fixture.componentRef.setInput('label', 'Défilement automatique');
  fixture.detectChanges();
  return { fixture };
}

describe('Switch', () => {
  it('reflects the checked input on the native checkbox', () => {
    const { fixture } = setup(true);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="checkbox"]');

    expect(input.checked).toBe(true);
  });

  it('emits checkedChange with the new value on toggle', () => {
    const { fixture } = setup(false);
    const emitted: boolean[] = [];
    fixture.componentInstance.checkedChange.subscribe((v) => emitted.push(v));
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="checkbox"]');

    input.checked = true;
    input.dispatchEvent(new Event('change'));

    expect(emitted).toEqual([true]);
  });

  it('writeValue (ControlValueAccessor) updates the rendered state', () => {
    const { fixture } = setup(false);
    fixture.componentInstance.writeValue(true);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="checkbox"]');

    expect(input.checked).toBe(true);
  });
});
