import { IsNotEmpty, IsString } from 'class-validator';

export class SuperAdminActionDto {
    @IsString()
    @IsNotEmpty()
    password!: string;
}
