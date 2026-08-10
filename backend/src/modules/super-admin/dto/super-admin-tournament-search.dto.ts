import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TournamentStatus } from 'src/enum/status.enum';
import { SuperAdminActionDto } from './super-admin-action.dto';

const SORTABLE_FIELDS = ['name', 'code', 'status', 'date', 'createdAt'] as const;

export class SuperAdminTournamentSearchDto extends SuperAdminActionDto {
    @IsInt()
    @Min(1)
    page!: number;

    @IsInt()
    @Min(1)
    pageSize!: number;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsIn(Object.values(TournamentStatus))
    status?: TournamentStatus;

    @IsOptional()
    @IsIn(SORTABLE_FIELDS)
    sortBy?: (typeof SORTABLE_FIELDS)[number];

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortDir?: 'ASC' | 'DESC';
}
