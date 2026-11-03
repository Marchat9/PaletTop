import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsNotEmpty,
    IsString,
    ValidateNested,
} from 'class-validator';
import { MAX_TEAM_CAPACITY } from 'src/modules/tournaments/dto/tournament-configuration.dto';
import { TournamentTeamDto } from 'src/modules/tournaments/dto/team-tournament.dto';

export class AddMultipleTeamsToTournamentDto {
    @IsArray()
    @ArrayMinSize(1, { message: 'Au moins une équipe est requise.' })
    @ArrayMaxSize(MAX_TEAM_CAPACITY, {
        message: `Pas plus de ${MAX_TEAM_CAPACITY} équipes par tournoi.`,
    })
    @ValidateNested({ each: true })
    @Type(() => TournamentTeamDto)
    teams: TournamentTeamDto[] = [];

    @IsString()
    @IsNotEmpty()
    password!: string;
}
