import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AppUpdatePopupComponent } from 'src/app/modales/app-update-popup/app-update-popup';
import { environment } from 'src/environments/environment';
import { AppUpdateService } from './app-update.service';

const VERSION_URL = `${environment.backBaseApiUrl}/version`;

function setup(appVersion: string) {
  environment.version = appVersion;
  // A CDK dialog emits `closed` once then completes: one stream per opened popup.
  const closings: Subject<boolean | undefined>[] = [];
  const dialog = {
    open: vi.fn(() => {
      const closed = new Subject<boolean | undefined>();
      closings.push(closed);
      return { closed };
    }),
  };
  const closeLast = (refresh: boolean) => {
    const closed = closings[closings.length - 1];
    closed.next(refresh);
    closed.complete();
  };
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: Dialog, useValue: dialog },
    ],
  });
  const service = TestBed.inject(AppUpdateService);
  const http = TestBed.inject(HttpTestingController);
  const reload = vi.spyOn(service, 'reloadPage').mockImplementation(() => undefined);
  return { service, http, dialog, closeLast, reload };
}

function stubServiceWorker(getRegistrations: () => Promise<ServiceWorkerRegistration[]>): void {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { getRegistrations },
    configurable: true,
  });
}

describe('AppUpdateService', () => {
  const builtVersion = environment.version;
  const serviceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');

  afterEach(() => {
    environment.version = builtVersion;
    if (serviceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', serviceWorker);
    } else {
      delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('prompts when the backend runs another release than this app', () => {
    const { service, http, dialog } = setup('1.4.1');

    service.checkVersion();
    http.expectOne(VERSION_URL).flush({ version: '1.4.2' });

    expect(dialog.open).toHaveBeenCalledWith(
      AppUpdatePopupComponent,
      expect.objectContaining({ data: { currentVersion: '1.4.1', latestVersion: '1.4.2' } }),
    );
  });

  it('stays quiet when this app is the deployed release', () => {
    const { service, http, dialog } = setup('1.4.2');

    service.checkVersion();
    http.expectOne(VERSION_URL).flush({ version: '1.4.2' });

    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('does not compare a local build, nor against a backend without release', () => {
    const local = setup('0.0.0');
    local.service.checkVersion();
    local.http.expectOne(VERSION_URL).flush({ version: '1.4.2' });
    expect(local.dialog.open).not.toHaveBeenCalled();

    TestBed.resetTestingModule();
    const unreleasedBack = setup('1.4.2');
    unreleasedBack.service.checkVersion();
    unreleasedBack.http.expectOne(VERSION_URL).flush({ version: '0.0.0' });
    expect(unreleasedBack.dialog.open).not.toHaveBeenCalled();
  });

  it('tells when the backend does not answer, without any popup, local builds included', () => {
    const { service, http, dialog } = setup('0.0.0');
    let outages = 0;
    service.serverUnreachable$.subscribe(() => outages++);

    service.checkVersion();
    http.expectOne(VERSION_URL).error(new ProgressEvent('error'));

    expect(outages).toBe(1);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('tells once per outage, and again only after the backend came back', () => {
    const { service, http } = setup('1.4.1');
    let outages = 0;
    service.serverUnreachable$.subscribe(() => outages++);
    const down = () => {
      service.checkVersion();
      http.expectOne(VERSION_URL).flush('down', { status: 503, statusText: 'Unavailable' });
    };

    down();
    down();
    expect(outages).toBe(1);

    service.checkVersion();
    http.expectOne(VERSION_URL).flush({ version: '1.4.1' });
    down();
    expect(outages).toBe(2);
  });

  it('opens a single popup at a time', () => {
    const { service, dialog, closeLast } = setup('1.4.1');

    service.promptUpdate('1.4.2');
    service.promptUpdate('1.4.2');
    expect(dialog.open).toHaveBeenCalledTimes(1);

    closeLast(false);
    service.promptUpdate('1.4.2');
    expect(dialog.open).toHaveBeenCalledTimes(2);
  });

  it('forces the refresh however the popup closes: worker unregistered, caches emptied, then reload', async () => {
    const { service, closeLast, reload } = setup('1.4.1');
    const unregister = vi.fn(async () => true);
    stubServiceWorker(async () => [{ unregister } as unknown as ServiceWorkerRegistration]);
    const cacheDelete = vi.fn(async () => true);
    vi.stubGlobal('caches', { keys: async () => ['ngsw:db', 'ngsw:app'], delete: cacheDelete });

    // Close button, Escape or backdrop: the stale app is never kept.
    service.promptUpdate('1.4.2');
    closeLast(false);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));

    service.promptUpdate('1.4.2');
    closeLast(true);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(2));
    expect(unregister).toHaveBeenCalled();
    expect(cacheDelete).toHaveBeenCalledWith('ngsw:db');
    expect(cacheDelete).toHaveBeenCalledWith('ngsw:app');
  });

  it('keeps cookies and local storage through the forced refresh', async () => {
    const { service, reload } = setup('1.4.1');
    stubServiceWorker(async () => []);
    vi.stubGlobal('caches', { keys: async () => ['ngsw:app'], delete: async () => true });
    document.cookie = 'palettop-session=keep';
    localStorage.setItem('palettop-admin', 'keep');

    await service.forceRefresh();

    expect(reload).toHaveBeenCalledTimes(1);
    expect(document.cookie).toContain('palettop-session=keep');
    expect(localStorage.getItem('palettop-admin')).toBe('keep');
    localStorage.removeItem('palettop-admin');
    document.cookie = 'palettop-session=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('still reloads when the cleanup fails', async () => {
    const { service, reload } = setup('1.4.1');
    stubServiceWorker(() => Promise.reject(new Error('denied')));

    await service.forceRefresh();

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
