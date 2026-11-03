import {
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    maxLengthMessage,
} from 'src/utils/text-limits.util';
import { Transform, Type } from 'class-transformer';
import {
    IsDate,
    IsDefined,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
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
    @MaxLength(MAX_NAME_LENGTH, { message: maxLengthMessage('Nom', MAX_NAME_LENGTH) })
    name!: string;

    @Transform(normalizedCode)
    @IsString()
    @IsNotEmpty()
    @Matches(CODE_PATTERN, { message: CODE_FORMAT_MESSAGE })
    @MaxLength(MAX_NAME_LENGTH, { message: maxLengthMessage('Code', MAX_NAME_LENGTH) })
    code!: string;

    @Type(() => Date)
    @IsDate()
    date!: Date;

    @IsString()
    @IsOptional()
    @MaxLength(MAX_DESCRIPTION_LENGTH, {
        message: maxLengthMessage('Description', MAX_DESCRIPTION_LENGTH),
    })
    description?: string;
}
