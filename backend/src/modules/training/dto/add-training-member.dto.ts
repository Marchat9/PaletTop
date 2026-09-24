import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trimmed } from 'src/utils/trim.transform';

export class AddTrainingMemberDto {
    @IsString()
    @IsNotEmpty()
    password!: string;

    @Transform(trimmed)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;
}
