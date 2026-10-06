import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { normalizedCode } from 'src/utils/code-format.util';

export class JoinTournamentDto {
    @Transform(normalizedCode)
    @IsString()
    @IsNotEmpty()
    tournamentCode!: string;

    @IsString()
    @IsNotEmpty()
    teamCode!: string;
}
