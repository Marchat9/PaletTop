import { Injectable, computed, signal } from '@angular/core';
import { environment } from '@environment';

export type PwaInstallPlatform = 'android' | 'ios' | 'unsupported';

interface BeforeInstallPromptEvent extends Event {
  prompt(): void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_AT_STORAGE_KEY = 'pwa-install-dismissed-at';
const REPROMPT_DELAY_MS = environment.pwa.delayRepromptInDay * 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);
  private readonly installed = signal(false);

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt.set(event as BeforeInstallPromptEvent);
    });

    window.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.deferredPrompt.set(null);
    });
  }

  public readonly platform = computed<PwaInstallPlatform>(() => {
    if (this.deferredPrompt()) {
      return 'android';
    }
    if (this.isIos()) {
      return 'ios';
    }
    return 'unsupported';
  });

  // NOTE: deliberately a plain method, not `computed()`. `isStandalone()` and
  // `isWithinDismissCooldown()` read `window.matchMedia` and `localStorage` directly
  // (non-signal sources), so an Angular `computed()` here would memoize on its tracked
  // signal deps (`installed`, `platform`) only and never notice `localStorage` changing
  // outside the service (e.g. the dismiss-cooldown expiring). See task-5-report.md.
  public shouldShowPrompt(): boolean {
    if (this.installed() || this.isStandalone() || this.platform() === 'unsupported') {
      return false;
    }
    return !this.isWithinDismissCooldown();
  }

  public promptInstall(): void {
    const event = this.deferredPrompt();
    if (!event) {
      return;
    }
    event.prompt();
    event.userChoice.then(() => this.deferredPrompt.set(null));
  }

  public dismiss(): void {
    try {
      localStorage.setItem(DISMISSED_AT_STORAGE_KEY, Date.now().toString());
    } catch {
      // Storage can throw (e.g. QuotaExceededError in iOS Safari private browsing, or
      // some embedded webviews) — degrade gracefully rather than leaving the popup's
      // close button unable to complete: the cooldown simply won't persist, so the
      // prompt may show again next visit instead of crashing.
    }
  }

  private isStandalone(): boolean {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
  }

  private isIos(): boolean {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  private isWithinDismissCooldown(): boolean {
    let dismissedAt: string | null;
    try {
      dismissedAt = localStorage.getItem(DISMISSED_AT_STORAGE_KEY);
    } catch {
      return false;
    }
    if (!dismissedAt) {
      return false;
    }
    return Date.now() - Number(dismissedAt) < REPROMPT_DELAY_MS;
  }
}
