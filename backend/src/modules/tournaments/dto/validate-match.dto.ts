import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class ValidateMatchDto {
    @IsString()
    @IsNotEmpty()
    teamCode!: string;

    @IsString()
    @IsNotEmpty()
    opponentTeamCode!: string;

    // Score the player saw when validating: refused if it changed since (stale realtime).
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
