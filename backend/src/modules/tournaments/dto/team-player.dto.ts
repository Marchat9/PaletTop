import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TeamPlayerDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsOptional()
    club?: string;
}
