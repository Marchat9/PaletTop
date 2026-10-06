import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { TournamentTeamDto } from 'src/modules/tournaments/dto/team-tournament.dto';

export class AddMultipleTeamsToTournamentDto {
    @IsArray()
    @ArrayMinSize(1, { message: 'Au moins une équipe est requise.' })
    @ValidateNested({ each: true })
    @Type(() => TournamentTeamDto)
    teams: TournamentTeamDto[] = [];

    @IsString()
    @IsNotEmpty()
    password!: string;
}
