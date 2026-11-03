import { MAX_TEAM_NAME_LENGTH, maxLengthMessage } from 'src/utils/text-limits.util';
import {
    ArrayMinSize,
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';

export class CreateFixedTeamDto {
    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    participantIds!: string[];

    @IsString()
    @IsOptional()
    @MaxLength(MAX_TEAM_NAME_LENGTH, {
        message: maxLengthMessage("Nom de l'équipe", MAX_TEAM_NAME_LENGTH),
    })
    name?: string;
}
