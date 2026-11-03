import { trimmed } from 'src/utils/trim.transform';
import { Transform } from 'class-transformer';
import {
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    maxLengthMessage,
} from 'src/utils/text-limits.util';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTrainingDto {
    @IsString()
    @IsNotEmpty()
    password!: string;

    // Optional, but when sent it must not blank the name.
    @Transform(trimmed)
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    @MaxLength(MAX_NAME_LENGTH, { message: maxLengthMessage('Nom', MAX_NAME_LENGTH) })
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(MAX_DESCRIPTION_LENGTH, {
        message: maxLengthMessage('Description', MAX_DESCRIPTION_LENGTH),
    })
    description?: string;
}
