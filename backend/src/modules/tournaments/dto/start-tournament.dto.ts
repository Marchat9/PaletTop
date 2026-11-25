import { BadRequestException } from '@nestjs/common';
import { plainToInstance, Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CompetitionMode } from 'src/enum/tounament.enum';
import { MAX_CONSOLATION_COUNT_LIMIT } from 'src/modules/app-settings/app-setting.definitions';
import type { StartRequest } from '../services/session.service';
import type { StartChoice } from '../strategies/tournament-strategy.abstract';
import { AdminQualifyingDto } from './admin-qualifying.dto';
import { MAX_TEAM_CAPACITY } from './tournament-configuration.dto';

/**
 * Start request. The body is the same for every mode (the mode is the tournament's, not the
 * request's), so this class checks what a field can hold; the subclasses below tell which of the
 * launch choice fields a mode accepts and how it reads them (`toStartChoice`). The choice is
 * optional: modes without a plan and older clients send the password only. The upper bound of
 * `consolationCount` is an app setting, checked by the strategy.
 */
export abstract class StartTournamentDto extends AdminQualifyingDto {
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

    /** The launch choice of the mode, or a 400 when the request holds a field the mode ignores. */
    abstract toStartChoice(): StartChoice;
}

/** Structured mode: the consolation count and the teams stopped after the qualifiers. */
export class StructuredStartTournamentDto extends StartTournamentDto {
    override toStartChoice(): StartChoice {
        return {
            consolationCount: this.consolationCount,
            eliminatedAfterQualifying: this.eliminatedAfterQualifying,
        };
    }
}

/** Modes without a launch choice (up-down, championship): any choice field is refused. */
export class NoChoiceStartTournamentDto extends StartTournamentDto {
    override toStartChoice(): StartChoice {
        if (this.consolationCount !== undefined || this.eliminatedAfterQualifying !== undefined) {
            throw new BadRequestException('Ce mode de compétition n’a pas de choix de lancement.');
        }
        return {};
    }
}

const START_DTO_BY_MODE: Record<CompetitionMode, new () => StartTournamentDto> = {
    [CompetitionMode.STANDARD]: StructuredStartTournamentDto,
    [CompetitionMode.UP_DOWN]: NoChoiceStartTournamentDto,
    [CompetitionMode.CHAMPIONSHIP]: NoChoiceStartTournamentDto,
};

/** The launch choice of a validated start request, read the way the tournament's mode does. */
export function startChoiceOf(mode: CompetitionMode, request: StartRequest): StartChoice {
    return plainToInstance(START_DTO_BY_MODE[mode], request).toStartChoice();
}
