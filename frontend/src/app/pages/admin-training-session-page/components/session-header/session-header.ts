import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Nullable } from 'src/app/models/nullable.model';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';
import { TrainingSessionAdminDto } from 'src/app/store/training/training.models';

interface SessionRule {
  icon: string;
  label: string;
}

@Component({
  selector: 'app-session-header',
  imports: [Card, Icon, DatePipe],
  templateUrl: './session-header.html',
  styleUrl: './session-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionHeader {
  public readonly session = input<Nullable<TrainingSessionAdminDto>>(null);

  protected readonly isOpen = computed(() => this.session()?.status === 'OPEN');

  /** Les réglages de matchmaking, figés à la création, résumés en une ligne de pastilles. */
  protected readonly rules = computed<SessionRule[]>(() => {
    const session = this.session();
    if (!session) {
      return [];
    }

    const fallbackSizes = session.allowedTeamSizes.filter(
      (size) => size !== session.playersPerTeam,
    );

    const rules: SessionRule[] = [
      { icon: 'group', label: `${session.playersPerTeam} joueurs / équipe` },
      { icon: 'flag', label: `${session.pointsPerGame} points` },
      { icon: 'table_restaurant', label: `${session.plateCount} plaques` },
    ];

    if (fallbackSizes.length > 0) {
      rules.push({ icon: 'group_add', label: `Repli : ${fallbackSizes.join(' ou ')}` });
    }
    rules.push(
      session.preferTargetTeamSize
        ? { icon: 'airline_seat_recline_normal', label: 'Taille d’équipe respectée' }
        : { icon: 'groups', label: 'Tout le monde joue' },
    );
    if (session.teamComposition === 'LEARNING') {
      rules.push({ icon: 'school', label: 'Équipes par niveau' });
    }
    if (session.avoidSamePartnerConsecutive) {
      rules.push({ icon: 'shuffle', label: 'Éviter le même partenaire' });
    }
    if (session.avoidSameOpponentConsecutive) {
      rules.push({ icon: 'shuffle', label: 'Éviter le même adversaire' });
    }

    return rules;
  });
}
