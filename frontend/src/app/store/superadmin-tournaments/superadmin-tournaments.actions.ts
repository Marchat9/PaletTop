import { createAction, props } from '@ngrx/store';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { SuperAdminTournamentSummaryDto } from 'src/app/services/super-admin-tournament.service';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';

export interface SuperAdminTournamentSearchCriteria {
  page: number;
  pageSize: number;
  search: string;
  status: TournamentStatus | null;
  sortBy: 'name' | 'code' | 'status' | 'date' | 'createdAt';
  sortDir: 'ASC' | 'DESC';
}

export const searchSuperAdminTournaments = createAction(
  '[SuperAdminTournaments] Search',
  props<{ criteria: SuperAdminTournamentSearchCriteria }>(),
);
export const searchSuperAdminTournamentsSuccess = createAction(
  '[SuperAdminTournaments] Search Success',
  props<{ items: SuperAdminTournamentSummaryDto[]; total: number }>(),
);
export const searchSuperAdminTournamentsFailure = createAction(
  '[SuperAdminTournaments] Search Failure',
  props<{ error: string }>(),
);

export const loadSuperAdminTournamentDetail = createAction(
  '[SuperAdminTournaments] Load Detail',
  props<{ id: string }>(),
);
export const loadSuperAdminTournamentDetailSuccess = createAction(
  '[SuperAdminTournaments] Load Detail Success',
  props<{ tournament: TournamentDto }>(),
);
export const loadSuperAdminTournamentDetailFailure = createAction(
  '[SuperAdminTournaments] Load Detail Failure',
  props<{ error: string }>(),
);
export const clearSuperAdminTournamentDetail = createAction('[SuperAdminTournaments] Clear Detail');

export const deleteSuperAdminTournaments = createAction(
  '[SuperAdminTournaments] Delete',
  props<{ ids: string[] }>(),
);
export const deleteSuperAdminTournamentsSuccess = createAction(
  '[SuperAdminTournaments] Delete Success',
);
export const deleteSuperAdminTournamentsFailure = createAction(
  '[SuperAdminTournaments] Delete Failure',
  props<{ error: string }>(),
);

export const changeSuperAdminTournamentsStatus = createAction(
  '[SuperAdminTournaments] Change Status',
  props<{ ids: string[]; status: TournamentStatus }>(),
);
export const changeSuperAdminTournamentsStatusSuccess = createAction(
  '[SuperAdminTournaments] Change Status Success',
);
export const changeSuperAdminTournamentsStatusFailure = createAction(
  '[SuperAdminTournaments] Change Status Failure',
  props<{ error: string }>(),
);

export const resetSuperAdminTournamentPassword = createAction(
  '[SuperAdminTournaments] Reset Password',
  props<{ id: string; newPassword: string }>(),
);
export const resetSuperAdminTournamentPasswordSuccess = createAction(
  '[SuperAdminTournaments] Reset Password Success',
);
export const resetSuperAdminTournamentPasswordFailure = createAction(
  '[SuperAdminTournaments] Reset Password Failure',
  props<{ error: string }>(),
);
