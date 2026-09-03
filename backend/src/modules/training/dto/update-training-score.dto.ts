import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpdateTrainingScoreDto {
    @IsString()
    @IsNotEmpty()
    participantCode!: string;

    @IsInt()
    @Min(0)
    scoreA!: number;

    @IsInt()
    @Min(0)
    scoreB!: number;
}
