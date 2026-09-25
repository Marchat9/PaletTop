import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsDate,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { TrainingTeamComposition } from 'src/enum/training.enum';

/**
 * Beyond this a "team" is no longer a team: the bound applies to the target size and to the
 * fallbacks.
 */
export const MAX_PLAYERS_PER_TEAM = 6;

export class CreateTrainingSessionDto {
    @IsString()
    @IsNotEmpty()
    password!: string;

    @Type(() => Date)
    @IsDate()
    date!: Date;

    @IsInt()
    @Min(1)
    @Max(MAX_PLAYERS_PER_TEAM)
    playersPerTeam!: number;

    /** Allowed fallback sizes; the target size is added by the service. */
    @IsArray()
    @ArrayMaxSize(MAX_PLAYERS_PER_TEAM)
    @IsInt({ each: true })
    @Min(1, { each: true })
    @Max(MAX_PLAYERS_PER_TEAM, { each: true })
    allowedTeamSizes!: number[];

    @IsBoolean()
    preferTargetTeamSize!: boolean;

    @IsInt()
    @Min(1)
    plateCount!: number;

    @IsEnum(TrainingTeamComposition)
    teamComposition!: TrainingTeamComposition;

    @IsBoolean()
    avoidSamePartnerConsecutive!: boolean;

    @IsBoolean()
    avoidSameOpponentConsecutive!: boolean;

    @IsInt()
    @Min(1)
    pointsPerGame!: number;
}
