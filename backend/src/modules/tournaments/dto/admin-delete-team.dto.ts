import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AdminDeleteTeam {
    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsUUID()
    teamId!: string;
}
