import { trimmed } from 'src/utils/trim.transform';
import {
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    maxLengthMessage,
} from 'src/utils/text-limits.util';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { CODE_FORMAT_MESSAGE, CODE_PATTERN, normalizedCode } from 'src/utils/code-format.util';

export class CreateTrainingDto {
    @Transform(normalizedCode)
    @IsString()
    @IsNotEmpty()
    @Matches(CODE_PATTERN, { message: CODE_FORMAT_MESSAGE })
    @MaxLength(MAX_NAME_LENGTH, { message: maxLengthMessage('Code', MAX_NAME_LENGTH) })
    code!: string;

    @Transform(trimmed)
    @IsString()
    @IsNotEmpty()
    @MaxLength(MAX_NAME_LENGTH, { message: maxLengthMessage('Nom', MAX_NAME_LENGTH) })
    name!: string;

    @IsString()
    @IsOptional()
    @MaxLength(MAX_DESCRIPTION_LENGTH, {
        message: maxLengthMessage('Description', MAX_DESCRIPTION_LENGTH),
    })
    description?: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/\S/, { message: 'Le mot de passe ne peut pas être vide.' })
    @MaxLength(MAX_NAME_LENGTH, { message: maxLengthMessage('Mot de passe', MAX_NAME_LENGTH) })
    adminPassword!: string;
}
