import {
    MAX_CLUB_LENGTH,
    MAX_TEAM_NAME_LENGTH,
    maxLengthMessage,
} from 'src/utils/text-limits.util';
import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { TeamPlayerDto } from 'src/modules/tournaments/dto/team-player.dto';

export class TournamentTeamDto {
    @IsString()
    @IsOptional()
    @MaxLength(MAX_TEAM_NAME_LENGTH, {
        message: maxLengthMessage("Nom de l'équipe", MAX_TEAM_NAME_LENGTH),
    })
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(MAX_CLUB_LENGTH, { message: maxLengthMessage('Club', MAX_CLUB_LENGTH) })
    club?: string;

    @IsArray()
    @ArrayMinSize(1, { message: 'Une équipe doit contenir au moins 1 joueur.' })
    @ValidateNested({ each: true })
    @Type(() => TeamPlayerDto)
    players: TeamPlayerDto[] = [];
}
