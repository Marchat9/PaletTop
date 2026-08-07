import { TestBed } from '@angular/core/testing';
import { DialogRef } from '@angular/cdk/dialog';
import { InstallPwaPopupComponent } from './install-pwa-popup';
import { PwaInstallService } from 'src/app/services/pwa-install.service';

function setup(platform: 'android' | 'ios' | 'unsupported') {
  const dialogRefMock = { close: vi.fn() };
  const pwaInstallServiceMock = {
    platform: () => platform,
    dismiss: vi.fn(),
    promptInstall: vi.fn(),
  };

  TestBed.configureTestingModule({
    imports: [InstallPwaPopupComponent],
    providers: [
      { provide: DialogRef, useValue: dialogRefMock },
      { provide: PwaInstallService, useValue: pwaInstallServiceMock },
    ],
  });

  const fixture = TestBed.createComponent(InstallPwaPopupComponent);
  fixture.detectChanges();
  return { fixture, dialogRefMock, pwaInstallServiceMock };
}

describe('InstallPwaPopupComponent', () => {
  it('shows iOS instructions and no install button on iOS', () => {
    const { fixture } = setup('ios');
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain("Sur l'écran d'accueil");
    expect(compiled.querySelector('app-button')).toBeNull();
  });

  it('shows an install button on android', () => {
    const { fixture } = setup('android');
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-button')).not.toBeNull();
  });

  it('dismisses via the service and closes the dialog on close()', () => {
    const { fixture, dialogRefMock, pwaInstallServiceMock } = setup('android');

    fixture.componentInstance.close();

    expect(pwaInstallServiceMock.dismiss).toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalled();
  });

  it('triggers the native prompt and closes the dialog on install()', () => {
    const { fixture, dialogRefMock, pwaInstallServiceMock } = setup('android');

    fixture.componentInstance.install();

    expect(pwaInstallServiceMock.promptInstall).toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalled();
  });
});
