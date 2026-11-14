import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const CLUB_SEARCH_MAX_LENGTH = 150;

export class ClubSearchDto {
    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsOptional()
    @IsString()
    @MaxLength(CLUB_SEARCH_MAX_LENGTH)
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    search?: string;
}
