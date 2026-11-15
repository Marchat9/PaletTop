import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { SuperAdminActionDto } from './super-admin-action.dto';

export class SuperAdminClubMergeDto extends SuperAdminActionDto {
    // Club merged into the target (`:id`) and then deleted.
    @IsUUID()
    sourceClubId!: string;

    // Optional new name of the kept club; may be the source club's name.
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    newName?: string;
}
