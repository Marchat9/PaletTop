import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AdminUpdateScoreDto {
    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsInt()
    @Min(0)
    scoreA!: number;

    @IsInt()
    @Min(0)
    scoreB!: number;
}
