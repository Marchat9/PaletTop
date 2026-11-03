import { Transform, Type } from 'class-transformer';
import {
    IsDate,
    IsDefined,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    ValidateNested,
} from 'class-validator';
import { CODE_FORMAT_MESSAGE, CODE_PATTERN, normalizedCode } from 'src/utils/code-format.util';
import { TournamentConfigurationDto } from './tournament-configuration.dto';

export class UpdateTournamentConfigurationDto {
    // The whole configuration is sent and validated, like at creation: the stored one is then
    // replaced, not merged key by key with whatever the request carried.
    @IsDefined()
    @ValidateNested()
    @Type(() => TournamentConfigurationDto)
    configuration!: TournamentConfigurationDto;

    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsString()
    @IsNotEmpty()
    name!: string;

    @Transform(normalizedCode)
    @IsString()
    @IsNotEmpty()
    @Matches(CODE_PATTERN, { message: CODE_FORMAT_MESSAGE })
    code!: string;

    @Type(() => Date)
    @IsDate()
    date!: Date;

    @IsString()
    @IsOptional()
    description?: string;
}
