import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpdateScoreDto {
    @IsString()
    @IsNotEmpty()
    teamCode!: string;

    @IsInt()
    @Min(0)
    scoreA!: number;

    @IsInt()
    @Min(0)
    scoreB!: number;

    // Score the entry is based on (last one confirmed to the player): refused if it changed since.
    // Optional, for the clients sent before this check existed.
    @IsOptional()
    @IsInt()
    @Min(0)
    previousScoreA?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    previousScoreB?: number;
}
