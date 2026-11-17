import { DestroyRef, signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutoPager } from './auto-pager.util';

function fakeDestroyRef() {
  const callbacks: (() => void)[] = [];
  const ref = {
    onDestroy: (callback: () => void) => callbacks.push(callback),
  } as unknown as DestroyRef;
  return { ref, destroy: () => callbacks.forEach((callback) => callback()) };
}

describe('AutoPager', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('découpe les éléments en pages de la taille demandée', () => {
    const pager = new AutoPager(signal(25), signal(10), 12_000, fakeDestroyRef().ref);

    expect(pager.pageCount()).toBe(3);
    expect(pager.page()).toBe(0);
    expect(pager.start()).toBe(0);
  });

  it('passe à la page suivante à chaque intervalle et revient au début après la dernière', () => {
    const pager = new AutoPager(signal(25), signal(10), 12_000, fakeDestroyRef().ref);

    vi.advanceTimersByTime(12_000);
    expect(pager.start()).toBe(10);
    vi.advanceTimersByTime(12_000);
    expect(pager.start()).toBe(20);
    vi.advanceTimersByTime(12_000);
    expect(pager.page()).toBe(0);
  });

  it('ne tourne pas quand tout tient sur une page', () => {
    const pager = new AutoPager(signal(8), signal(10), 12_000, fakeDestroyRef().ref);

    vi.advanceTimersByTime(36_000);

    expect(pager.pageCount()).toBe(1);
    expect(pager.page()).toBe(0);
  });

  it('garde sa page quand les données changent, et la ramène dans les bornes si elles rétrécissent', () => {
    const total = signal(30);
    const pager = new AutoPager(total, signal(10), 12_000, fakeDestroyRef().ref);
    vi.advanceTimersByTime(24_000);
    expect(pager.page()).toBe(2);

    total.set(31);
    expect(pager.page()).toBe(2);

    total.set(15);
    expect(pager.page()).toBe(1);
  });

  it('considère qu’il y a au moins une page, même vide ou sans place', () => {
    const pager = new AutoPager(signal(0), signal(0), 12_000, fakeDestroyRef().ref);

    expect(pager.pageCount()).toBe(1);
    expect(pager.start()).toBe(0);
  });

  it('arrête son minuteur à la destruction de la page', () => {
    const destroyRef = fakeDestroyRef();
    const pager = new AutoPager(signal(25), signal(10), 12_000, destroyRef.ref);

    destroyRef.destroy();
    vi.advanceTimersByTime(36_000);

    expect(pager.page()).toBe(0);
  });
});
