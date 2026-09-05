import { IsIn, IsOptional } from 'class-validator';
import { SuperAdminSearchBaseDto } from './super-admin-search-base.dto';

const SORTABLE_FIELDS = ['name', 'code', 'club', 'createdAt', 'sessionsCount'] as const;

export class SuperAdminTrainingSearchDto extends SuperAdminSearchBaseDto {
    @IsOptional()
    @IsIn(SORTABLE_FIELDS)
    sortBy?: (typeof SORTABLE_FIELDS)[number];
}
