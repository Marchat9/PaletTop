import { IsIn, IsOptional } from 'class-validator';
import { TournamentStatus } from 'src/enum/status.enum';
import { SuperAdminSearchBaseDto } from './super-admin-search-base.dto';

const SORTABLE_FIELDS = ['name', 'code', 'status', 'date', 'createdAt', 'teamsCount'] as const;

export class SuperAdminTournamentSearchDto extends SuperAdminSearchBaseDto {
    @IsOptional()
    @IsIn(Object.values(TournamentStatus))
    status?: TournamentStatus;

    @IsOptional()
    @IsIn(SORTABLE_FIELDS)
    sortBy?: (typeof SORTABLE_FIELDS)[number];
}
