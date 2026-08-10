import { createAction, props } from '@ngrx/store';
import { SuperAdminClubSummaryDto } from 'src/app/services/super-admin-club.service';

export interface SuperAdminClubSearchCriteria {
  page: number;
  pageSize: number;
  search: string;
  sortBy: 'name' | 'playersCount';
  sortDir: 'ASC' | 'DESC';
}

export const searchSuperAdminClubs = createAction(
  '[SuperAdminClubs] Search',
  props<{ criteria: SuperAdminClubSearchCriteria }>(),
);
export const searchSuperAdminClubsSuccess = createAction(
  '[SuperAdminClubs] Search Success',
  props<{ items: SuperAdminClubSummaryDto[]; total: number }>(),
);
export const searchSuperAdminClubsFailure = createAction(
  '[SuperAdminClubs] Search Failure',
  props<{ error: string }>(),
);

export const renameSuperAdminClub = createAction(
  '[SuperAdminClubs] Rename',
  props<{ id: string; name: string }>(),
);
export const renameSuperAdminClubSuccess = createAction('[SuperAdminClubs] Rename Success');
export const renameSuperAdminClubFailure = createAction(
  '[SuperAdminClubs] Rename Failure',
  props<{ error: string }>(),
);

export const deleteSuperAdminClubs = createAction(
  '[SuperAdminClubs] Delete',
  props<{ ids: string[] }>(),
);
export const deleteSuperAdminClubsSuccess = createAction('[SuperAdminClubs] Delete Success');
export const deleteSuperAdminClubsFailure = createAction(
  '[SuperAdminClubs] Delete Failure',
  props<{ error: string }>(),
);
