import { MAX_CLUB_LENGTH, MAX_NAME_LENGTH, maxLengthMessage } from 'src/utils/text-limits.util';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class TeamPlayerDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(MAX_NAME_LENGTH, { message: maxLengthMessage('Nom du joueur', MAX_NAME_LENGTH) })
    name!: string;

    @IsString()
    @IsOptional()
    @MaxLength(MAX_CLUB_LENGTH, { message: maxLengthMessage('Club', MAX_CLUB_LENGTH) })
    club?: string;
}
