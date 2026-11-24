import { environment } from '@environment';
import { Nullable } from 'src/app/models/nullable.model';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';

/** Absolute maximum of teams in a tournament, as the backend's `MAX_TEAM_CAPACITY`. */
const ABSOLUTE_TEAM_CAPACITY = environment.tournamentConfiguration.maxTeamCapacity.max;

type TournamentCapacity = Pick<TournamentDto, 'configuration'>;

/** The structured mode only targets `maxTeamCapacity`: teams can register above it. */
export function hasSoftTeamTarget(tournament: TournamentCapacity): boolean {
  return tournament.configuration.competitionMode === 'standard';
}

/**
 * Teams the tournament accepts: up to the absolute maximum when its capacity is only a target,
 * its capacity otherwise (the absolute maximum when none is configured or nothing is loaded).
 */
export function registrationCapacity(tournament: Nullable<TournamentCapacity>): number {
  if (!tournament || hasSoftTeamTarget(tournament)) {
    return ABSOLUTE_TEAM_CAPACITY;
  }
  return tournament.configuration.maxTeamCapacity ?? ABSOLUTE_TEAM_CAPACITY;
}

/** « 12 équipes (cible 16) » when the capacity is only a target, « 12 / 16 équipes » otherwise. */
export function registeredTeamsLabel(tournament: TournamentDto): string {
  const count = tournament.teams?.length ?? 0;
  if (hasSoftTeamTarget(tournament)) {
    const teams = count > 1 ? 'équipes' : 'équipe';
    return `${count} ${teams} (cible ${tournament.configuration.maxTeamCapacity})`;
  }
  return `${count} / ${registrationCapacity(tournament)} équipes`;
}
