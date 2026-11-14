import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { InputText } from './input-text';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(InputText);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  const field = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
  return { fixture, field };
}

describe('InputText', () => {
  it('sets aria-invalid and the invalid class when invalid', () => {
    const { field } = render({ invalid: true });
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.classList.contains('invalid')).toBe(true);
  });

  it('forwards aria-describedby', () => {
    const { field } = render({ describedBy: 'err-1' });
    expect(field.getAttribute('aria-describedby')).toBe('err-1');
  });

  it('renders combobox ARIA attributes only when provided', () => {
    const { field } = render({
      role: 'combobox',
      ariaExpanded: true,
      ariaControls: 'list-1',
      ariaActivedescendant: 'opt-2',
      ariaAutocomplete: 'list',
    });
    expect(field.getAttribute('role')).toBe('combobox');
    expect(field.getAttribute('aria-expanded')).toBe('true');
    expect(field.getAttribute('aria-controls')).toBe('list-1');
    expect(field.getAttribute('aria-activedescendant')).toBe('opt-2');
    expect(field.getAttribute('aria-autocomplete')).toBe('list');
  });

  it('renders aria-expanded false when explicitly false', () => {
    const { field } = render({ ariaExpanded: false });
    expect(field.getAttribute('aria-expanded')).toBe('false');
  });

  it('emits focused, blurred and keyPressed', () => {
    const { fixture, field } = render();
    const events: string[] = [];
    fixture.componentInstance.focused.subscribe(() => events.push('focused'));
    fixture.componentInstance.blurred.subscribe(() => events.push('blurred'));
    let key = '';
    fixture.componentInstance.keyPressed.subscribe((e) => (key = e.key));
    field.dispatchEvent(new Event('focus'));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    field.dispatchEvent(new Event('blur'));
    expect(events).toEqual(['focused', 'blurred']);
    expect(key).toBe('ArrowDown');
  });

  it('renders as before with defaults', () => {
    const { field } = render();
    for (const attr of [
      'aria-invalid',
      'aria-describedby',
      'role',
      'aria-expanded',
      'aria-controls',
      'aria-activedescendant',
      'aria-autocomplete',
    ]) {
      expect(field.hasAttribute(attr)).toBe(false);
    }
    expect(field.classList.contains('invalid')).toBe(false);
  });
});
