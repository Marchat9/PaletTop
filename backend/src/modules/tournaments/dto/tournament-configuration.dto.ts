import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsDefined,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    Max,
    Min,
    Validate,
} from 'class-validator';
import { CompetitionMode, ScoreCalculation } from 'src/enum/tounament.enum';
import {
    CompetitionConfigConstraint,
    SpecificTournamentConfig,
} from './tournament-comptetition-configuration.dto';

/** Same bound as the frontend form: also caps a single team import. */
export const MAX_TEAM_CAPACITY = 256;

/** Nothing to do with the game, only a bound so a typo cannot travel to the database. */
export const MAX_POINTS_PER_GAME = 100;

export class TournamentConfigurationDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_TEAM_CAPACITY)
    @IsNotEmpty()
    maxTeamCapacity!: number;

    @IsEnum(ScoreCalculation)
    @IsNotEmpty()
    scoreCalculation!: ScoreCalculation;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_POINTS_PER_GAME)
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
