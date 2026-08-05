import { IsNotEmpty, IsString } from 'class-validator';

export class AdminDeleteTeam {
    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsString()
    @IsNotEmpty()
    teamId!: string;
}
