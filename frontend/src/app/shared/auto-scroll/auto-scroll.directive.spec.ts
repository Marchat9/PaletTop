import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutoScrollDirective } from './auto-scroll.directive';

@Component({
  template: `<div [appAutoScroll]="enabled()" style="height: 10px; overflow-y: auto;">
    <div style="height: 1000px;"></div>
  </div>`,
  imports: [AutoScrollDirective],
})
class HostComponent {
  // A signal (rather than a plain field) is required here: this project's Angular 21
  // zoneless TestBed only re-checks bindings that participate in the reactivity graph
  // between two `detectChanges()` calls. A plain mutated field either throws a
  // false-positive NG0100 or is silently skipped — reproducible with no directive
  // involved at all. See task-4-report.md for the isolation steps.
  enabled = signal(false);
}

describe('AutoScrollDirective', () => {
  let rafSpy: ReturnType<typeof vi.spyOn>;
  let cafSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    rafSpy.mockRestore();
    cafSpy.mockRestore();
  });

  it('does not start the animation loop while disabled', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    // Angular's own zoneless TestBed schedules an unrelated, anonymous
    // requestAnimationFrame call as part of its internal stability/idle-callback
    // race (see scheduleCallbackWithRafRace in @angular/core) on every fixture's
    // first detectChanges(), independent of any directive. Only the directive's own
    // `tick` callback (a named class-field arrow function) indicates its loop started.
    const directiveCalls = rafSpy.mock.calls.filter(
      (call: unknown[]) => (call[0] as { name: string }).name === 'tick',
    );
    expect(directiveCalls).toHaveLength(0);
  });

  it('starts the animation loop when enabled becomes true', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    fixture.componentInstance.enabled.set(true);
    fixture.detectChanges();

    expect(rafSpy).toHaveBeenCalled();
  });

  it('cancels the animation loop when enabled goes back to false', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.enabled.set(true);
    fixture.detectChanges();

    fixture.componentInstance.enabled.set(false);
    fixture.detectChanges();

    expect(cafSpy).toHaveBeenCalled();
  });
});
