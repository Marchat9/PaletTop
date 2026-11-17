import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';
import { InfoTile } from 'src/app/shared/info-tile/info-tile';
import { StatusPill } from 'src/app/shared/status-pill/status-pill';
import { AdminHeaderInfo, AdminHeaderStatus } from './admin-page-header.model';

/**
 * Header of an admin page (tournament, training group, training session): what is being run, its
 * code, its statuses and key information. The page projects its actions (`[headerActions]`) and the
 * details under the title (description, rules…).
 */
@Component({
  selector: 'app-admin-page-header',
  imports: [Card, Icon, InfoTile, StatusPill],
  templateUrl: './admin-page-header.html',
  styleUrl: './admin-page-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPageHeader {
  public readonly eyebrow = input.required<string>();
  public readonly title = input<Nullable<string>>(null);
  public readonly icon = input<string>('label');
  /** A date as title reads better with its words capitalised (« Mardi 17 Novembre »). */
  public readonly capitalizeTitle = input<boolean>(false);
  public readonly code = input<Nullable<string>>(null);
  public readonly codeLabel = input<string>('Code');
  /** The code is read out to the room: shown large, legible from afar. */
  public readonly prominentCode = input<boolean>(false);
  public readonly statuses = input<AdminHeaderStatus[]>([]);
  public readonly infos = input<AdminHeaderInfo[]>([]);
}
