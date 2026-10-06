import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { CODE_FORMAT_MESSAGE, CODE_PATTERN } from 'src/utils/code-format.util';
import { TournamentConfigurationDto } from './tournament-configuration.dto';

export class UpdateTournamentConfigurationDto {
    @IsNotEmpty()
    configuration!: TournamentConfigurationDto;

    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    @Matches(CODE_PATTERN, { message: CODE_FORMAT_MESSAGE })
    code!: string;

    @IsString()
    date!: Date;

    @IsString()
    @IsOptional()
    description?: string;
}
