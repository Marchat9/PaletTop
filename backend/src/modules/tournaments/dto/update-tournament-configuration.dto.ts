import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TournamentConfigurationDto } from './tournament-configuration.dto';

export class UpdateTournamentConfigurationDto {
    @IsNotEmpty()
    configuration!: TournamentConfigurationDto;

    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsString()
    date!: Date;

    @IsString()
    @IsOptional()
    description?: string;
}
