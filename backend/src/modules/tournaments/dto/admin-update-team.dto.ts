import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, ValidateNested } from 'class-validator';
import { TournamentTeamDto } from 'src/modules/tournaments/dto/team-tournament.dto';

export class AdminUpdateTeam {
    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsUUID()
    teamId!: string;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => TournamentTeamDto)
    teamData!: TournamentTeamDto;
}
