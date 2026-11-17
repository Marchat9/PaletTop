import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { PlayerStatTile } from 'src/app/models/player-match-view.model';
import { Avatar } from 'src/app/shared/avatar/avatar';
import { Icon } from 'src/app/shared/icon/icon';
import { PlayerStatsTiles } from 'src/app/shared/player-stats-tiles/player-stats-tiles';
import { StatusPill } from 'src/app/shared/status-pill/status-pill';
import { PlayerHeaderInfo, PlayerHeaderStatus } from './player-header.model';

/**
 * Header of a player page, tournament (their team) or training (themselves): who they are, their
 * codes, where they stand, and their statistics.
 */
@Component({
  selector: 'app-player-header',
  imports: [Avatar, Icon, PlayerStatsTiles, StatusPill],
  templateUrl: './player-header.html',
  styleUrl: './player-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerHeader {
  /** « Fiche équipe », « Séance d'entraînement ». */
  public readonly eyebrow = input.required<string>();
  public readonly title = input<Nullable<string>>(null);
  /** A person: their initials beside the title. */
  public readonly showAvatar = input<boolean>(false);
  public readonly infos = input<PlayerHeaderInfo[]>([]);
  public readonly status = input<Nullable<PlayerHeaderStatus>>(null);
  public readonly tiles = input<PlayerStatTile[]>([]);

  public readonly tileClicked = output<PlayerStatTile>();
}
