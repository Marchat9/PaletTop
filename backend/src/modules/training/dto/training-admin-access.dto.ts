import { IsNotEmpty, IsString } from 'class-validator';

export class TrainingAdminAccessDto {
    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;
}
