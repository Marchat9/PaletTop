import { IsNotEmpty, IsString } from 'class-validator';

export class SuperAdminLoginDto {
    @IsString()
    @IsNotEmpty()
    password!: string;
}
