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
import { TournamentConfigurationDto } from 'src/modules/tournaments/dto/tournament-configuration.dto';

export class CreateTournamentDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @Transform(normalizedCode)
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

    // Without @ValidateNested + @Type, none of the nested rules ran: a 0 or negative points
    // target, an unknown mode or a missing competition configuration all went through.
    @IsDefined()
    @ValidateNested()
    @Type(() => TournamentConfigurationDto)
    configuration!: TournamentConfigurationDto;
}
