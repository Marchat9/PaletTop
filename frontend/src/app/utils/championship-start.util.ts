import { ChampionShipTournamentConfig } from 'src/app/models/tournament-configuration-detail.model';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';

/** A championship is one home club against one away club, 4 teams each: same rule as the API. */
export const CHAMPIONSHIP_TEAMS_PER_CLUB = 4;

/**
 * Why a championship cannot start yet, or null when it can (or is not a championship). Shown next
 * to the start button rather than discovered as an error after the click.
 */
export function championshipStartBlocker(tournament: TournamentDto | null): string | null {
  if (tournament?.configuration.competitionMode !== 'championship') {
    return null;
  }

  const { homeClub, awayClub } = tournament.configuration
    .competitionConfiguration as ChampionShipTournamentConfig;
  const teams = tournament.teams ?? [];
  const homeCount = teams.filter((team) => team.club === homeClub).length;
  const awayCount = teams.filter((team) => team.club === awayClub).length;
  const otherCount = teams.length - homeCount - awayCount;

  if (
    otherCount === 0 &&
    homeCount === CHAMPIONSHIP_TEAMS_PER_CLUB &&
    awayCount === CHAMPIONSHIP_TEAMS_PER_CLUB
  ) {
    return null;
  }

  const split = `${homeCount} équipe(s) pour ${homeClub}, ${awayCount} pour ${awayClub}`;
  const others = otherCount > 0 ? ` et ${otherCount} sans club du championnat` : '';
  return `Un championnat se joue à ${CHAMPIONSHIP_TEAMS_PER_CLUB} équipes contre ${CHAMPIONSHIP_TEAMS_PER_CLUB} : ${split}${others}.`;
}
