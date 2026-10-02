import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { CODE_FORMAT_MESSAGE, CODE_PATTERN } from 'src/utils/code-format.util';
import { TournamentConfigurationDto } from 'src/modules/tournaments/dto/tournament-configuration.dto';

export class CreateTournamentDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    @Matches(CODE_PATTERN, { message: CODE_FORMAT_MESSAGE })
    code!: string;

    @IsString()
    @IsNotEmpty()
    adminPassword!: string;

    @Type(() => Date)
    @IsDate()
    @IsNotEmpty()
    date!: Date;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNotEmpty()
    configuration!: TournamentConfigurationDto;
}
