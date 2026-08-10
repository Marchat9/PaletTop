import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SuperAdminActionDto } from './super-admin-action.dto';

const SORTABLE_FIELDS = ['name', 'playersCount'] as const;

export class SuperAdminClubSearchDto extends SuperAdminActionDto {
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
    @IsIn(SORTABLE_FIELDS)
    sortBy?: (typeof SORTABLE_FIELDS)[number];

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortDir?: 'ASC' | 'DESC';
}
