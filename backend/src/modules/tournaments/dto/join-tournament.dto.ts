import { IsNotEmpty, IsString } from 'class-validator';

export class JoinTournamentDto {
    @IsString()
    @IsNotEmpty()
    tournamentCode!: string;

    @IsString()
    @IsNotEmpty()
    teamCode!: string;
}
