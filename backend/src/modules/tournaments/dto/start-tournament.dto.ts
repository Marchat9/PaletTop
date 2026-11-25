import { plainToInstance, Transform, Type } from 'class-transformer';
import { IsDefined, IsEnum, IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { CompetitionMode } from 'src/enum/tounament.enum';
import { MAX_CONSOLATION_COUNT_LIMIT } from 'src/modules/app-settings/app-setting.definitions';
import { AdminQualifyingDto } from './admin-qualifying.dto';
import { MAX_TEAM_CAPACITY } from './tournament-configuration.dto';

/**
 * What the launch dialog sends for a competition mode. One subclass per mode, picked by the
 * request's `competitionMode` (see `StartTournamentDto`); a field the mode does not know, or any option for a mode without
 * options, is refused by the validation pipe.
 */
export abstract class CompetitionModeStartOptions {}

/**
 * Structured mode: the launch check. The upper bound of `consolationCount` is an app setting,
 * checked by the strategy.
 */
export class StructuredStartOptions extends CompetitionModeStartOptions {
    /** Team count of the launch check: a different count refuses the start (409). */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(MAX_TEAM_CAPACITY)
    expectedTeamCount?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(MAX_CONSOLATION_COUNT_LIMIT)
    consolationCount?: number;

    /** The last X teams of the qualifiers play no elimination match. */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(MAX_TEAM_CAPACITY)
    eliminatedAfterQualifying?: number;
}

/** Modes without a launch choice (up-down, championship) have no class: no options are accepted. */
const START_OPTIONS_BY_MODE: Partial<
    Record<CompetitionMode, new () => CompetitionModeStartOptions>
> = {
    [CompetitionMode.STANDARD]: StructuredStartOptions,
};

/**
 * Start request. The options are optional, and null or absent for a mode without any and
 * become the class of the sibling `competitionMode`: class-transformer's `@Type` cannot read a
 * sibling field, so the `@Transform` does it. The service checks that the mode is the tournament's.
 */
export class StartTournamentDto extends AdminQualifyingDto {
    @IsEnum(CompetitionMode)
    @IsDefined()
    competitionMode!: CompetitionMode;

    @IsOptional()
    @Transform(({ value, obj }: { value: unknown; obj: { competitionMode?: CompetitionMode } }) => {
        const optionsClass = obj.competitionMode && START_OPTIONS_BY_MODE[obj.competitionMode];
        return optionsClass && typeof value === 'object' && value !== null
            ? plainToInstance(optionsClass, value)
            : value;
    })
    @ValidateNested()
    competitionModeStartOptions?: StructuredStartOptions | null;
}
