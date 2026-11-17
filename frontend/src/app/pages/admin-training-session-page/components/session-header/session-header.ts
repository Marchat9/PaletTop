import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Nullable } from 'src/app/models/nullable.model';
import { AdminPageHeader } from 'src/app/shared/admin-page-header/admin-page-header';
import {
  AdminHeaderMetric,
  AdminHeaderStatus,
} from 'src/app/shared/admin-page-header/admin-page-header.model';
import { InlineNotice } from 'src/app/shared/inline-notice/inline-notice';
import { RulePill, RulePills } from 'src/app/shared/rule-pills/rule-pills';
import { TrainingSessionAdminDto } from 'src/app/store/training/training.models';

@Component({
  selector: 'app-session-header',
  imports: [AdminPageHeader, DatePipe, InlineNotice, RulePills],
  templateUrl: './session-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionHeader {
  public readonly session = input<Nullable<TrainingSessionAdminDto>>(null);
  /** Key figures of the session (present players, round…), computed by the page. */
  public readonly metrics = input<AdminHeaderMetric[]>([]);

  protected readonly statuses = computed<AdminHeaderStatus[]>(() => {
    const status = this.session()?.status;
    if (!status) {
      return [];
    }
    return [
      status === 'OPEN'
        ? { label: 'Ouverte', tone: 'ongoing' }
        : { label: 'Clôturée', tone: 'pending' },
    ];
  });

  /** The matchmaking settings, frozen at creation, summed up in one row of pills. */
  protected readonly rules = computed<RulePill[]>(() => {
    const session = this.session();
    if (!session) {
      return [];
    }

    const fallbackSizes = session.allowedTeamSizes.filter(
      (size) => size !== session.playersPerTeam,
    );

    const rules: RulePill[] = [
      { icon: 'group', label: `${session.playersPerTeam} joueurs / équipe` },
      { icon: 'flag', label: `${session.pointsPerGame} points` },
      { icon: 'table_restaurant', label: `${session.plateCount} plaques` },
    ];

    if (fallbackSizes.length > 0) {
      rules.push({ icon: 'group_add', label: `Repli : ${fallbackSizes.join(' ou ')}` });
    }
    rules.push(
      session.preferTargetTeamSize
        ? { icon: 'airline_seat_recline_normal', label: 'Nombre de joueurs par équipe strict' }
        : { icon: 'groups', label: 'Le plus de monde joue' },
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
