import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SuperAdminActionDto } from './super-admin-action.dto';

export abstract class SuperAdminSearchBaseDto extends SuperAdminActionDto {
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
    @IsIn(['ASC', 'DESC'])
    sortDir?: 'ASC' | 'DESC';
}
