import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InputAutocomplete } from './input-autocomplete';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(InputAutocomplete);
  fixture.componentRef.setInput('id', 'club');
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const field = host.querySelector('input') as HTMLInputElement;
  const searches: string[] = [];
  const values: string[] = [];
  fixture.componentInstance.search.subscribe((v) => searches.push(v));
  fixture.componentInstance.valueChange.subscribe((v) => values.push(v));
  const type = (text: string) => {
    field.value = text;
    field.dispatchEvent(new Event('input'));
  };
  const key = (k: string) => {
    const event = new KeyboardEvent('keydown', { key: k, cancelable: true });
    field.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };
  const focus = () => {
    field.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
  };
  const options = () => Array.from(host.querySelectorAll<HTMLElement>('[role="option"]'));
  return { fixture, host, field, searches, values, type, key, focus, options };
}

describe('InputAutocomplete', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('emits search once after the debounce while typing', () => {
    const { type, searches } = render({ debounceMs: 250 });
    type('P');
    vi.advanceTimersByTime(100);
    type('Pa');
    vi.advanceTimersByTime(249);
    expect(searches).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(searches).toEqual(['Pa']);
  });

  it('emits search on focus with an empty value', () => {
    const { focus, searches } = render();
    focus();
    expect(searches).toEqual(['']);
  });

  it('emits search on focus with the current value', () => {
    const { focus, searches } = render({ value: 'Pal' });
    focus();
    expect(searches).toEqual(['Pal']);
  });

  it('opens the listbox when options arrive and the field is focused', () => {
    const { fixture, focus, options, host } = render();
    focus();
    expect(host.querySelector('[role="listbox"]')).toBeNull();
    fixture.componentRef.setInput('options', ['Alpha', 'Beta']);
    fixture.detectChanges();
    expect(options().map((o) => o.textContent?.trim())).toEqual(['Alpha', 'Beta']);
  });

  it('does not open the listbox when not focused', () => {
    const { fixture, host } = render();
    fixture.componentRef.setInput('options', ['Alpha']);
    fixture.detectChanges();
    expect(host.querySelector('[role="listbox"]')).toBeNull();
  });

  it('ArrowDown/ArrowUp move the active option and wrap', () => {
    const { host, focus, key, options } = render({ options: ['A', 'B', 'C'] });
    focus();
    key('ArrowDown');
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    key('ArrowUp');
    expect(options()[2].getAttribute('aria-selected')).toBe('true');
    key('ArrowDown');
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    key('ArrowDown');
    expect(options()[1].getAttribute('aria-selected')).toBe('true');
    expect(host.querySelectorAll('[aria-selected="true"]').length).toBe(1);
  });

  it('Enter selects the active option and emits valueChange', () => {
    const { focus, key, values, options } = render({ options: ['A', 'B'] });
    focus();
    key('ArrowDown');
    key('ArrowDown');
    const event = key('Enter');
    expect(values).toEqual(['B']);
    expect(event.defaultPrevented).toBe(true);
    expect(options().length).toBe(0);
  });

  it('Enter without an active option does nothing special', () => {
    const { focus, key, values } = render({ options: ['A'] });
    focus();
    const event = key('Enter');
    expect(values).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });

  it('Escape closes without changing the value', () => {
    const { focus, key, values, options } = render({ options: ['A', 'B'] });
    focus();
    key('ArrowDown');
    key('Escape');
    expect(options().length).toBe(0);
    expect(values).toEqual([]);
  });

  it('keeps free text when no option is selected', () => {
    const { focus, type, values, key } = render({ options: ['Alpha'] });
    focus();
    type('Custom club');
    key('Enter');
    expect(values).toEqual(['Custom club']);
  });

  it('exposes combobox, listbox and option roles with aria-activedescendant', () => {
    const { focus, key, field, host, options } = render({ options: ['A', 'B'] });
    expect(field.getAttribute('role')).toBe('combobox');
    expect(field.getAttribute('aria-expanded')).toBe('false');
    focus();
    key('ArrowDown');
    const listbox = host.querySelector('[role="listbox"]') as HTMLElement;
    expect(listbox.id).toBe('club-listbox');
    expect(options().map((o) => o.id)).toEqual(['club-option-0', 'club-option-1']);
    expect(field.getAttribute('aria-expanded')).toBe('true');
    expect(field.getAttribute('aria-controls')).toBe('club-listbox');
    expect(field.getAttribute('aria-activedescendant')).toBe('club-option-0');
    expect(field.getAttribute('aria-autocomplete')).toBe('list');
  });

  it('option mousedown does not blur before selection', () => {
    const { focus, fixture, options, values } = render({ options: ['A', 'B'] });
    focus();
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    options()[1].dispatchEvent(event);
    fixture.detectChanges();
    expect(event.defaultPrevented).toBe(true);
    expect(values).toEqual(['B']);
    expect(options().length).toBe(0);
  });

  it('closes the listbox on blur', () => {
    const { focus, field, fixture, options } = render({ options: ['A'] });
    focus();
    expect(options().length).toBe(1);
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(options().length).toBe(0);
  });

  it('scrolls the active option into view on ArrowDown', () => {
    const spy = vi.fn();
    (HTMLElement.prototype as any).scrollIntoView = spy;
    const { fixture, focus, key } = render({ options: ['A', 'B'] });
    focus();
    key('ArrowDown');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith({ block: 'nearest' });
    expect((spy.mock.instances.at(-1) as HTMLElement).id).toBe('club-option-0');
  });

  describe('live region', () => {
    const status = (host: HTMLElement) =>
      host.querySelector('[role="status"]') as HTMLElement;

    it('is always present, polite and atomic, and empty when not focused', () => {
      const { host } = render({ options: ['A'] });
      const el = status(host);
      expect(el.getAttribute('aria-live')).toBe('polite');
      expect(el.getAttribute('aria-atomic')).toBe('true');
      expect(el.textContent?.trim()).toBe('');
    });

    it('announces one suggestion', () => {
      const { host, focus } = render({ options: ['A'] });
      focus();
      expect(status(host).textContent?.trim()).toBe('1 suggestion disponible');
    });

    it('announces several suggestions', () => {
      const { host, focus } = render({ options: ['A', 'B', 'C'] });
      focus();
      expect(status(host).textContent?.trim()).toBe('3 suggestions disponibles');
    });

    it('is empty with no options', () => {
      const { host, focus } = render();
      focus();
      expect(status(host).textContent?.trim()).toBe('');
    });
  });
});
