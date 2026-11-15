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

  it('does not check a local build, nor against a backend without release', () => {
    const local = setup('0.0.0');
    local.service.checkVersion();
    local.http.expectNone(VERSION_URL);

    TestBed.resetTestingModule();
    const unreleasedBack = setup('1.4.2');
    unreleasedBack.service.checkVersion();
    unreleasedBack.http.expectOne(VERSION_URL).flush({ version: '0.0.0' });
    expect(unreleasedBack.dialog.open).not.toHaveBeenCalled();
  });

  it('ignores an unreachable backend', () => {
    const { service, http, dialog } = setup('1.4.1');

    service.checkVersion();
    http.expectOne(VERSION_URL).flush('down', { status: 503, statusText: 'Unavailable' });

    expect(dialog.open).not.toHaveBeenCalled();
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

  it('forces the refresh only when asked: worker unregistered, caches emptied, then reload', async () => {
    const { service, closeLast, reload } = setup('1.4.1');
    const unregister = vi.fn(async () => true);
    stubServiceWorker(async () => [{ unregister } as unknown as ServiceWorkerRegistration]);
    const cacheDelete = vi.fn(async () => true);
    vi.stubGlobal('caches', { keys: async () => ['ngsw:db', 'ngsw:app'], delete: cacheDelete });

    service.promptUpdate('1.4.2');
    closeLast(false);
    expect(reload).not.toHaveBeenCalled();

    service.promptUpdate('1.4.2');
    closeLast(true);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(unregister).toHaveBeenCalled();
    expect(cacheDelete).toHaveBeenCalledWith('ngsw:db');
    expect(cacheDelete).toHaveBeenCalledWith('ngsw:app');
  });

  it('still reloads when the cleanup fails', async () => {
    const { service, reload } = setup('1.4.1');
    stubServiceWorker(() => Promise.reject(new Error('denied')));

    await service.forceRefresh();

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
