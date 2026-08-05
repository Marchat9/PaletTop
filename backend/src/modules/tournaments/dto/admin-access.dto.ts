import { IsNotEmpty, IsString } from 'class-validator';

export class AdminAccessDto {
    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;
}
