import { Nullable } from 'src/app/models/nullable.model';
import { TrainingTeamDto } from 'src/app/store/training/training.models';

/** The players of a team, on one line (« Alice · Bob »). */
export function teamMembersLabel(team: TrainingTeamDto): string {
  return team.members.map((member) => member.name).join(' · ');
}

/** An ephemeral team has no name: it is designated by its players. */
export function teamLabel(team: Nullable<TrainingTeamDto>): string {
  if (!team) {
    return '—';
  }
  return team.name || teamMembersLabel(team);
}

export function isInTeam(team: Nullable<TrainingTeamDto>, participantId: string): boolean {
  return (team?.members ?? []).some((member) => member.id === participantId);
}
