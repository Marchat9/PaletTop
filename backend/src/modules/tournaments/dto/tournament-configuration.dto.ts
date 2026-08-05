import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { CompetitionMode, ScoreCalculation } from 'src/enum/tounament.enum';
import { SpecificTournamentConfig } from './tournament-comptetition-configuration.dto';

export class TournamentConfigurationDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsNotEmpty()
    maxTeamCapacity!: number;

    @IsNotEmpty()
    scoreCalculation!: ScoreCalculation;

    @Type(() => Number)
    @IsInt()
    @IsNotEmpty()
    pointsPerGame!: number;

    @IsBoolean()
    @IsOptional()
    rematch?: boolean;

    @IsBoolean()
    @IsOptional()
    matchAgainstFullSameClub?: boolean;

    @IsBoolean()
    @IsOptional()
    matchAgainstPartialSameClub?: boolean;

    @IsEnum(CompetitionMode)
    @IsNotEmpty()
    competitionMode!: CompetitionMode;

    @IsDefined()
    competitionConfiguration!: SpecificTournamentConfig;
}
