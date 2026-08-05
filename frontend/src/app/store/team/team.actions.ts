import { createAction, props } from '@ngrx/store';
import { TeamDto } from 'src/app/models/team.model';

export const loadTeam = createAction(
  '[Team] Load Team',
  props<{ tournamentCode: string; teamCode: string }>(),
);
export const loadTeamSuccess = createAction('[Team] Load Team Success', props<{ team: TeamDto }>());
export const loadTeamFailure = createAction('[Team] Load Team Failure', props<{ error: string }>());
