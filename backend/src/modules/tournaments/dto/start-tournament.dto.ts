import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_CONSOLATION_COUNT_LIMIT } from 'src/modules/app-settings/app-setting.definitions';
import { AdminQualifyingDto } from './admin-qualifying.dto';
import { MAX_TEAM_CAPACITY } from './tournament-configuration.dto';

/**
 * Start request. The choice confirmed in the launch dialog is optional: modes without a plan and
 * older clients send the password only. The upper bound of `consolationCount` is an app setting,
 * checked by the strategy.
 */
export class StartTournamentDto extends AdminQualifyingDto {
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
