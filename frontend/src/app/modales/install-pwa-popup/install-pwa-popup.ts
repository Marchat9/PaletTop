import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { ButtonIcon } from 'src/app/shared/button-icon/button-icon';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { PwaInstallService } from 'src/app/services/pwa-install.service';

@Component({
  selector: 'app-install-pwa-popup',
  imports: [Button, ButtonIcon, Icon],
  templateUrl: './install-pwa-popup.html',
  styleUrl: './install-pwa-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallPwaPopupComponent {
  private readonly pwaInstallService = inject(PwaInstallService);
  private readonly dialogRef = inject(DialogRef<void, InstallPwaPopupComponent>);

  public readonly isIos = computed(() => this.pwaInstallService.platform() === 'ios');

  public close(): void {
    this.pwaInstallService.dismiss();
    this.dialogRef.close();
  }

  public install(): void {
    this.pwaInstallService.promptInstall();
    this.dialogRef.close();
  }
}
