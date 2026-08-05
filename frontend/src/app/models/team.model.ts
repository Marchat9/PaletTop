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
