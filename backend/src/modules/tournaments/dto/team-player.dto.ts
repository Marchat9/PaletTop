import { IsNotEmpty, IsString } from 'class-validator';

export class TeamPlayerDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    club?: string;
}
