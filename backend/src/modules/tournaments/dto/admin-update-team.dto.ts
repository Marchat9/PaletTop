import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
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
    @ValidateNested()
    @Type(() => TournamentTeamDto)
    teamData!: TournamentTeamDto;
}
