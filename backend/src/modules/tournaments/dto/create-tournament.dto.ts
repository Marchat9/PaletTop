import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TournamentConfigurationDto } from 'src/modules/tournaments/dto/tournament-configuration.dto';

export class CreateTournamentDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsString()
    @IsNotEmpty()
    adminPassword!: string;

    @Type(() => Date)
    @IsDate()
    @IsNotEmpty()
    date!: Date;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNotEmpty()
    configuration!: TournamentConfigurationDto;
}
