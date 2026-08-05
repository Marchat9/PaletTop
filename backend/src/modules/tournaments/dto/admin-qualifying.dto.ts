import { IsNotEmpty, IsString } from 'class-validator';

export class AdminQualifyingDto {
    @IsString()
    @IsNotEmpty()
    password!: string;
}
