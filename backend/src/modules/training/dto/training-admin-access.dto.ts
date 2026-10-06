import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { normalizedCode } from 'src/utils/code-format.util';

export class TrainingAdminAccessDto {
    @Transform(normalizedCode)
    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;
}
