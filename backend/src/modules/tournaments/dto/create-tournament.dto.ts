import { trimmed } from 'src/utils/trim.transform';
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
import { TournamentConfigurationDto } from 'src/modules/tournaments/dto/tournament-configuration.dto';

export class CreateTournamentDto {
    @Transform(trimmed)
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

    @IsString()
    @IsNotEmpty()
    @Matches(/\S/, { message: 'Le mot de passe ne peut pas être vide.' })
    @MaxLength(MAX_NAME_LENGTH, { message: maxLengthMessage('Mot de passe', MAX_NAME_LENGTH) })
    adminPassword!: string;

    @Type(() => Date)
    @IsDate()
    @IsNotEmpty()
    date!: Date;

    @IsString()
    @IsOptional()
    @MaxLength(MAX_DESCRIPTION_LENGTH, {
        message: maxLengthMessage('Description', MAX_DESCRIPTION_LENGTH),
    })
    description?: string;

    // Without @ValidateNested + @Type, none of the nested rules ran: a 0 or negative points
    // target, an unknown mode or a missing competition configuration all went through.
    @IsDefined()
    @ValidateNested()
    @Type(() => TournamentConfigurationDto)
    configuration!: TournamentConfigurationDto;
}
