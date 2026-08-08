import { TestBed } from '@angular/core/testing';
import { PwaInstallService } from './pwa-install.service';
import { environment } from '@environment';

function dispatchBeforeInstallPrompt(
  overrides: Partial<{ prompt: () => void; userChoice: Promise<{ outcome: string }> }> = {},
): void {
  const event = Object.assign(new Event('beforeinstallprompt'), {
    prompt: overrides.prompt ?? (() => {}),
    userChoice: overrides.userChoice ?? Promise.resolve({ outcome: 'accepted' }),
  });
  window.dispatchEvent(event);
}

function stubMatchMedia(matches: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

function stubUserAgent(userAgent: string): void {
  Object.defineProperty(window.navigator, 'userAgent', { value: userAgent, configurable: true });
}

describe('PwaInstallService', () => {
  beforeEach(() => {
    localStorage.clear();
    stubMatchMedia(false);
    stubUserAgent('Mozilla/5.0 (Linux; Android 13)');
    Object.defineProperty(window.navigator, 'standalone', {
      value: undefined,
      configurable: true,
    });
  });

  it('reports "unsupported" until beforeinstallprompt fires, then "android"', () => {
    const service = TestBed.inject(PwaInstallService);
    expect(service.platform()).toBe('unsupported');

    dispatchBeforeInstallPrompt();

    expect(service.platform()).toBe('android');
    expect(service.shouldShowPrompt()).toBe(true);
  });

  it('reports "ios" on an iOS user agent, with no beforeinstallprompt support', () => {
    stubUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');

    const service = TestBed.inject(PwaInstallService);

    expect(service.platform()).toBe('ios');
    expect(service.shouldShowPrompt()).toBe(true);
  });

  it('never shows the prompt once running in standalone display mode', () => {
    stubMatchMedia(true);
    const service = TestBed.inject(PwaInstallService);
    dispatchBeforeInstallPrompt();

    expect(service.shouldShowPrompt()).toBe(false);
  });

  it('calls prompt() on the captured event and stops offering install once chosen', async () => {
    const promptSpy = vi.fn();
    const service = TestBed.inject(PwaInstallService);
    dispatchBeforeInstallPrompt({
      prompt: promptSpy,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });

    service.promptInstall();
    expect(promptSpy).toHaveBeenCalled();

    await Promise.resolve();
    expect(service.shouldShowPrompt()).toBe(false);
  });

  it("hides the prompt for 'delayRepromptInDay' days after dismiss(), then shows it again", () => {
    const service = TestBed.inject(PwaInstallService);
    dispatchBeforeInstallPrompt();

    service.dismiss();
    expect(service.shouldShowPrompt()).toBe(false);

    const overNDaysAgo =
      Date.now() - environment.pwa.delayRepromptInDay * 24 * 60 * 60 * 1000 - 1000;
    localStorage.setItem('pwa-install-dismissed-at', overNDaysAgo.toString());
    expect(service.shouldShowPrompt()).toBe(true);
  });

  it('marks the app installed on appinstalled and stops showing the prompt', () => {
    const service = TestBed.inject(PwaInstallService);
    dispatchBeforeInstallPrompt();
    expect(service.shouldShowPrompt()).toBe(true);

    window.dispatchEvent(new Event('appinstalled'));

    expect(service.shouldShowPrompt()).toBe(false);
  });
});
