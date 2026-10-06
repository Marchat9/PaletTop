import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { TeamPlayerDto } from 'src/modules/tournaments/dto/team-player.dto';

export class TournamentTeamDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    club?: string;

    @IsArray()
    @ArrayMinSize(1, { message: 'Une équipe doit contenir au moins 1 joueur.' })
    @ValidateNested({ each: true })
    @Type(() => TeamPlayerDto)
    players: TeamPlayerDto[] = [];
}
