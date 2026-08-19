import { TounamentTeamDto } from 'src/app/store/tournament/tournament.models';

export interface TeamPlayerFormValue {
  name: string;
  club: string;
}

export interface TeamEditFormValue {
  teamId: string;
  name: string;
  players: TeamPlayerFormValue[];
}

export function generateDefaultPlayerRow(): TeamPlayerFormValue {
  return { name: '', club: '' };
}

export function toTeamEditFormValue(team: TounamentTeamDto): TeamEditFormValue {
  return {
    teamId: team.id,
    name: team.name,
    players: team.players.map((player) => ({ name: player.name, club: player.club ?? '' })),
  };
}

// Unique, comma-joined list of the team's players' clubs, for the team list's Club(s) column.
export function summarizeClubs(team: TounamentTeamDto): string {
  const clubs = new Set(
    team.players.map((player) => player.club?.trim()).filter((club): club is string => !!club),
  );
  return clubs.size ? Array.from(clubs).join(', ') : '—';
}

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
