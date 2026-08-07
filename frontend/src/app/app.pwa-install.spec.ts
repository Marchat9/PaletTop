import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { Dialog } from '@angular/cdk/dialog';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { App } from './app';
import { appConfigFeatureKey } from 'src/app/store/app-config/app-config.selectors';
import { initialAppConfigState } from 'src/app/store/app-config/app-config.reducer';
import { PwaInstallService } from 'src/app/services/pwa-install.service';
import { environment } from '../environments/environment';

// NOTE: deviates from the task-7 brief, which used `vi.mock('../environments/environment', ...)`.
// The Angular unit-test builder (@angular/build, vitest runner) statically bundles each spec file
// together with its whole local source graph via esbuild before vitest ever runs it, and its
// vitest-mock-patch setup file hard-blocks any `vi.mock` call whose specifier starts with `.` or
// `/` ("not supported for relative imports... use Angular TestBed for mocking dependencies").
// Non-relative specifiers (a `@environment` tsconfig alias, and even the plain absolute filesystem
// path to environment.ts) were tried too and silently failed to intercept the module actually
// imported by app.ts — confirming local modules are inlined at build time and are not part of a
// runtime module graph vi.mock can hook into. Since `environment` is a plain mutable object and
// TestBed/app.ts import the exact same singleton instance from the same bundle, we instead flip
// `environment.pwa.enabled` directly for the duration of this suite and restore it afterward.
describe('App - PWA install popup', () => {
  const originalPwaEnabled = environment.pwa.enabled;

  beforeEach(() => {
    environment.pwa.enabled = true;
  });

  afterEach(() => {
    environment.pwa.enabled = originalPwaEnabled;
  });

  // `app.ts` calls `dialog.open(...).closed.pipe(first()).subscribe(...)` (Fix 2), so the
  // mocked `DialogRef` needs a real Observable for `closed` (a plain `{ subscribe() {} }`
  // object has no `.pipe`). A `Subject` that we control lets tests also simulate the dialog
  // closing (backdrop click / Escape / cancelled install) by calling `.next()`.
  function mockDialogRef() {
    const closed = new Subject<void>();
    return { closed };
  }

  function configure(shouldShowPrompt: boolean) {
    const dialogRef = mockDialogRef();
    const openSpy = vi.fn().mockReturnValue(dialogRef);

    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { [appConfigFeatureKey]: initialAppConfigState } }),
        { provide: Dialog, useValue: { open: openSpy } },
        { provide: PwaInstallService, useValue: { shouldShowPrompt: () => shouldShowPrompt } },
      ],
    });

    return { openSpy, dialogRef };
  }

  it('opens the install popup once stable when the feature is enabled and eligible', async () => {
    const { openSpy } = configure(true);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('does not open the popup when the user is not eligible', async () => {
    const { openSpy } = configure(false);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(openSpy).not.toHaveBeenCalled();
  });

  // Fix 1: `afterNextRender` only ever checked eligibility once, milliseconds after first
  // render — before Chrome has a chance to asynchronously dispatch `beforeinstallprompt`.
  // The fix replaces it with a reactive `effect()` that reruns whenever the signals read
  // through `shouldShowPrompt()` change. This test proves the popup can still open when
  // eligibility flips from false to true *after* the component has already gone stable
  // once ineligible — something the old one-shot check could never do.
  it('opens the popup once eligibility becomes true after an initial ineligible check', async () => {
    const eligible = signal(false);
    const dialogRef = mockDialogRef();
    const openSpy = vi.fn().mockReturnValue(dialogRef);

    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { [appConfigFeatureKey]: initialAppConfigState } }),
        { provide: Dialog, useValue: { open: openSpy } },
        { provide: PwaInstallService, useValue: { shouldShowPrompt: () => eligible() } },
      ],
    });

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(openSpy).not.toHaveBeenCalled();

    eligible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('does not reopen the popup once already opened, even if eligibility flips again', async () => {
    const eligible = signal(true);
    const dialogRef = mockDialogRef();
    const openSpy = vi.fn().mockReturnValue(dialogRef);

    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { [appConfigFeatureKey]: initialAppConfigState } }),
        { provide: Dialog, useValue: { open: openSpy } },
        { provide: PwaInstallService, useValue: { shouldShowPrompt: () => eligible() } },
      ],
    });

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(openSpy).toHaveBeenCalledTimes(1);

    eligible.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    eligible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  // Fix 2: backdrop click / Escape / a cancelled native install prompt all close the dialog
  // via `DialogRef.close()` directly, bypassing `InstallPwaPopupComponent.close()` (which is
  // the only place that used to call `dismiss()`). `App` must itself subscribe to `.closed`
  // and call `dismiss()` unconditionally so the cooldown still engages in those cases.
  it('calls dismiss() when the dialog closes for any reason (backdrop/Escape/cancelled install)', async () => {
    const dismissSpy = vi.fn();
    const dialogRef = mockDialogRef();
    const openSpy = vi.fn().mockReturnValue(dialogRef);

    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { [appConfigFeatureKey]: initialAppConfigState } }),
        { provide: Dialog, useValue: { open: openSpy } },
        {
          provide: PwaInstallService,
          useValue: { shouldShowPrompt: () => true, dismiss: dismissSpy },
        },
      ],
    });

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(dismissSpy).not.toHaveBeenCalled();

    dialogRef.closed.next();

    expect(dismissSpy).toHaveBeenCalledTimes(1);
  });
});
