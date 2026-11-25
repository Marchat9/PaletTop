import { Type } from 'class-transformer';
import { IsDefined, IsEnum, IsInt, Max, Min, Validate } from 'class-validator';
import { CompetitionMode } from 'src/enum/tounament.enum';
import {
    CompetitionConfigConstraint,
    SpecificTournamentConfig,
} from './tournament-comptetition-configuration.dto';
import { MAX_TEAM_CAPACITY } from './tournament-configuration.dto';

/** « Et si j'ai X équipes ? » : the plan of a configuration that is not saved yet. */
export class PlanPreviewDto {
    @IsEnum(CompetitionMode)
    competitionMode!: CompetitionMode;

    @IsDefined()
    @Validate(CompetitionConfigConstraint)
    competitionConfiguration!: SpecificTournamentConfig;

    @Type(() => Number)
    @IsInt()
    @Min(2)
    @Max(MAX_TEAM_CAPACITY)
    teamCount!: number;

    /** The tournament's `maxTeamCapacity` (« Nombre d'équipes cible »). */
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_TEAM_CAPACITY)
    targetCount!: number;
}
