import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsDefined,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    Min,
    Validate,
} from 'class-validator';
import { CompetitionMode, ScoreCalculation } from 'src/enum/tounament.enum';
import {
    CompetitionConfigConstraint,
    SpecificTournamentConfig,
} from './tournament-comptetition-configuration.dto';

export class TournamentConfigurationDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsNotEmpty()
    maxTeamCapacity!: number;

    @IsEnum(ScoreCalculation)
    @IsNotEmpty()
    scoreCalculation!: ScoreCalculation;

    @Type(() => Number)
    @IsInt()
    @Min(1)
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
    @Validate(CompetitionConfigConstraint)
    competitionConfiguration!: SpecificTournamentConfig;
}
