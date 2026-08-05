import { IsNotEmpty, IsString } from 'class-validator';
import { TeamPlayerDto } from 'src/modules/tournaments/dto/team-player.dto';

export class TournamentTeamDto {
    @IsString()
    name?: string;

    @IsNotEmpty()
    players: TeamPlayerDto[] = [];
}
