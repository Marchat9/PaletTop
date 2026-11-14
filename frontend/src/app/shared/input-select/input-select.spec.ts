import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { InputSelect } from './input-select';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(InputSelect);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  const field = (fixture.nativeElement as HTMLElement).querySelector('select') as HTMLSelectElement;
  return field;
}

describe('InputSelect', () => {
  it('sets aria-invalid and the invalid class when invalid', () => {
    const field = render({ invalid: true });
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.classList.contains('invalid')).toBe(true);
  });

  it('forwards aria-describedby', () => {
    expect(render({ describedBy: 'err-1' }).getAttribute('aria-describedby')).toBe('err-1');
  });

  it('renders as before with defaults', () => {
    const field = render();
    expect(field.hasAttribute('aria-invalid')).toBe(false);
    expect(field.hasAttribute('aria-describedby')).toBe(false);
    expect(field.classList.contains('invalid')).toBe(false);
  });
});
