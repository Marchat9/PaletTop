import { IsNotEmpty, IsString } from 'class-validator';
import { TournamentTeamDto } from 'src/modules/tournaments/dto/team-tournament.dto';

export class AddMultipleTeamsToTournamentDto {
    @IsNotEmpty()
    teams: TournamentTeamDto[] = [];

    @IsString()
    @IsNotEmpty()
    password!: string;
}
