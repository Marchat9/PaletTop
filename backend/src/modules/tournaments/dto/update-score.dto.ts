import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

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
}
