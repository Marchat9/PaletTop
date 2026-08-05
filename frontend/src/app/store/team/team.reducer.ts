import { createReducer, on } from '@ngrx/store';
import { ApiCall } from 'src/app/models/api-call.model';
import { Nullable } from 'src/app/models/nullable.model';
import { TeamDto } from 'src/app/models/team.model';
import { resetTournament } from 'src/app/store/tournament/tournament.actions';
import { loadTeam, loadTeamFailure, loadTeamSuccess } from './team.actions';

export interface TeamState {
  data: ApiCall<Nullable<TeamDto>>;
}

export const initialTeamState: TeamState = {
  data: { data: null, isLoading: false, error: null },
};

export const teamReducer = createReducer(
  initialTeamState,
  on(loadTeam, (state) => ({
    ...state,
    data: { ...state.data, isLoading: true, error: null },
  })),
  on(loadTeamSuccess, (state, { team }) => ({
    ...state,
    data: { data: team, isLoading: false, error: null },
  })),
  on(loadTeamFailure, (state, { error }) => ({
    ...state,
    data: { ...state.data, isLoading: false, error },
  })),
  on(resetTournament, () => initialTeamState),
);
