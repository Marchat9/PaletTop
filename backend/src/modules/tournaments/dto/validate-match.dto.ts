import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateMatchDto {
    @IsString()
    @IsNotEmpty()
    teamCode!: string;

    @IsString()
    @IsNotEmpty()
    opponentTeamCode!: string;
}
