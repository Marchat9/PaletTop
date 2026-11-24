import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { HasUnsavedChanges, unsavedChangesGuard } from './unsaved-configuration.guard';

function run(page: HasUnsavedChanges, closed$ = new Subject<boolean>()) {
  const dialog = { open: vi.fn().mockReturnValue({ closed: closed$ }) };
  TestBed.configureTestingModule({ providers: [{ provide: Dialog, useValue: dialog }] });
  const result = TestBed.runInInjectionContext(() =>
    unsavedChangesGuard(
      page,
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
      {} as RouterStateSnapshot,
    ),
  );
  return { result, dialog, closed$ };
}

describe('unsavedChangesGuard', () => {
  it('lets the admin leave without asking when nothing is left to lose', () => {
    const { result, dialog } = run({ hasUnsavedChanges: () => false });

    expect(result).toBe(true);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('asks first, and leaves once the admin confirms', async () => {
    const { result, dialog, closed$ } = run({ hasUnsavedChanges: () => true });
    expect(dialog.open).toHaveBeenCalledTimes(1);

    closed$.next(true);

    await expect(result).resolves.toBe(true);
  });

  it('stays on the page when the admin does not confirm', async () => {
    const { result, closed$ } = run({ hasUnsavedChanges: () => true });

    closed$.next(false);

    await expect(result).resolves.toBe(false);
  });
});
