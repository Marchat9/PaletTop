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

/** Au-delà, une « équipe » n'en est plus une : la borne vaut pour la taille visée et les replis. */
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

    /** Tailles de repli autorisées ; la taille visée y est ajoutée d'office côté service. */
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
