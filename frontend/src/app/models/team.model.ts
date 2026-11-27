export interface TeamPlayerDto {
  id: string;
  name: string;
  club?: string;
}

export interface TeamDto {
  id: string;
  name: string;
  code: string;
  players: TeamPlayerDto[];
}

/** The team as the player screen reads it: its identity and its place in the tournament. */
export interface PlayerTeamDto extends TeamDto {
  /** Stopped after the qualifiers: no elimination match, the qualifying rank is final. */
  eliminatedAfterQualifying: boolean;
}

export interface UpdateTeamRequest {
  code: string;
  password: string;
  teamId: string;
  teamData: {
    name?: string;
    players: { name: string; club?: string }[];
  };
}

export interface DeleteTeamRequest {
  code: string;
  password: string;
  teamId: string;
}
