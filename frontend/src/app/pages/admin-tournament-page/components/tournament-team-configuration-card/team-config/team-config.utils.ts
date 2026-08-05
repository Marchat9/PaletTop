import { TounamentTeamDto } from 'src/app/store/tournament/tournament.models';

export function filterTeams(teams: TounamentTeamDto[], research: string): TounamentTeamDto[] {
  const search = research.trim().toLowerCase();
  if ((search ?? '').length === 0) {
    return teams;
  }

  return teams.filter((team) => {
    const teamText = `${team.name} ${team.code ?? ''}`.trim().toLowerCase();

    const playersText = team.players
      .map((player) => `${player.name} ${player.club ?? ''}`)
      .join(' ')
      .trim()
      .toLowerCase();

    return teamText.includes(search) || playersText.includes(search);
  });
}
