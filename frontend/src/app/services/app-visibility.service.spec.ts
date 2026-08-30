import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { AppVisibilityService } from './app-visibility.service';

function setVisibilityState(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

describe('AppVisibilityService', () => {
  it('emits resumed$ when the document becomes visible again', () => {
    const service = TestBed.inject(AppVisibilityService);
    const spy = vi.fn();
    service.resumed$.subscribe(spy);

    setVisibilityState('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not emit resumed$ when the document becomes hidden', () => {
    const service = TestBed.inject(AppVisibilityService);
    const spy = vi.fn();
    service.resumed$.subscribe(spy);

    setVisibilityState('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(spy).not.toHaveBeenCalled();
  });

  it('does not emit resumed$ on a plain window focus (e.g. desktop alt-tab)', () => {
    const service = TestBed.inject(AppVisibilityService);
    const spy = vi.fn();
    service.resumed$.subscribe(spy);

    window.dispatchEvent(new Event('focus'));

    expect(spy).not.toHaveBeenCalled();
  });

  it('emits resumed$ when the network comes back online', () => {
    const service = TestBed.inject(AppVisibilityService);
    const spy = vi.fn();
    service.resumed$.subscribe(spy);

    window.dispatchEvent(new Event('online'));

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
