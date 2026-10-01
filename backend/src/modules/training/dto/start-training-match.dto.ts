import { IsNotEmpty, IsString } from 'class-validator';

export class StartTrainingMatchDto {
    @IsString()
    @IsNotEmpty()
    participantCode!: string;
}
