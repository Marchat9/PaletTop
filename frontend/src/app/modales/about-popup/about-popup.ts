import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { environment } from 'src/environments/environment';
import { ButtonIcon } from '../../shared/button-icon/button-icon';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-about-popup',
  imports: [ButtonIcon, Icon, NgOptimizedImage],
  templateUrl: './about-popup.html',
  styleUrl: './about-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPopupComponent {
  readonly dialogRef = inject(DialogRef<void>);

  readonly appVersion = environment.version;
  readonly githubRepoUrl = environment.githubRepoUrl;
  readonly githubIssuesUrl = `${environment.githubRepoUrl}/issues`;
  readonly aboutBio = environment.about.bio;
  readonly contactEmail = environment.about.contactEmail;
  readonly socialUrl = environment.about.socialUrl;
  readonly donationUrl = environment.about.donationUrl;

  onClose(): void {
    this.dialogRef.close();
  }
}
