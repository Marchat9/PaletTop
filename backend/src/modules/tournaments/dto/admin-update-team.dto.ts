import { IsNotEmpty, IsString } from 'class-validator';
import { TournamentTeamDto } from 'src/modules/tournaments/dto/team-tournament.dto';

export class AdminUpdateTeam {
    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsString()
    @IsNotEmpty()
    teamId!: string;

    @IsNotEmpty()
    teamData!: TournamentTeamDto;
}
