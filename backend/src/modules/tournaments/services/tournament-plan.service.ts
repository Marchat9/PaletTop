import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { StructuredCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { AppSettingKey } from 'src/enum/app-setting.enum';
import { TournamentStatus } from 'src/enum/status.enum';
import { CompetitionMode } from 'src/enum/tounament.enum';
import { AppSettingsService } from 'src/modules/app-settings/app-settings.service';
import { PlanSettings, TournamentStrategy } from '../strategies/tournament-strategy.abstract';
import { TournamentStrategyFactory } from '../strategies/tournament-strategy.factory';
import { TournamentPlan } from '../strategies/structured/plan/plan.types';
import { PlanPreviewDto } from '../dto/plan-preview.dto';
import { TournamentConfigurationDto } from '../dto/tournament-configuration.dto';
import { extractCompetitionConfiguration } from '../utils/tournament.utils';

/**
 * Reads the app settings a tournament plan depends on and asks the tournament's strategy for its
 * plan (strategies are built by a factory and have no access to the settings).
 */
@Injectable()
export class TournamentPlanService {
    private readonly logger = new Logger(TournamentPlanService.name);

    constructor(
        private readonly appSettingsService: AppSettingsService,
        private readonly strategyFactory: TournamentStrategyFactory,
    ) {}

    async getPlanSettings(): Promise<PlanSettings> {
        const [maxConsolations, thresholds] = await Promise.all([
            this.appSettingsService.get(AppSettingKey.MAX_CONSOLATION_COUNT),
            this.appSettingsService.get(AppSettingKey.BRACKET_FILL_THRESHOLDS),
        ]);
        return { maxConsolations, thresholds };
    }

    /**
     * The plan of a configuration that is not saved (creation form, « et si j'ai X équipes ? »):
     * computed as for a draft with `teamCount` teams and the target `targetCount`. The fields the
     * backend writes at launch are dropped from the request, like at creation.
     */
    async previewPlan(dto: PlanPreviewDto): Promise<TournamentPlan> {
        const settings = await this.getPlanSettings();
        const competitionConfiguration = extractCompetitionConfiguration({
            competitionMode: dto.competitionMode,
            competitionConfiguration: dto.competitionConfiguration,
        } as TournamentConfigurationDto);

        if (dto.competitionMode === CompetitionMode.STANDARD) {
            const { consolationCount } =
                competitionConfiguration as StructuredCompetitionConfiguration;
            if (consolationCount > settings.maxConsolations) {
                this.logger.warn(
                    `Plan preview refused: ${consolationCount} consolations (max ${settings.maxConsolations})`,
                );
                throw new BadRequestException(
                    `Au maximum ${settings.maxConsolations} consolantes.`,
                );
            }
        }

        const draft = {
            code: 'preview',
            status: TournamentStatus.DRAFT,
            teams: [],
            configuration: {
                maxTeamCapacity: dto.targetCount,
                competitionMode: dto.competitionMode,
                competitionConfiguration,
            },
        } as unknown as Tournament;
        const plan = this.strategyFactory
            .create(dto.competitionMode)
            .computePlan(draft, dto.teamCount, settings);
        if (!plan) {
            this.logger.warn(`Plan preview refused: no plan for mode ${dto.competitionMode}`);
            throw new BadRequestException("Ce mode de compétition n'a pas de plan.");
        }
        this.logger.debug(
            `Plan preview: ${dto.teamCount} teams, target ${dto.targetCount}, ${plan.brackets.length} brackets`,
        );
        return plan;
    }

    /**
     * The plan shown on the admin page: frozen at launch once started, computed with the
     * registered teams in draft. A failure only costs the plan (logged), never the admin page.
     */
    async buildPlan(
        tournament: Tournament,
        strategy?: TournamentStrategy,
    ): Promise<TournamentPlan | null> {
        try {
            const settings = await this.getPlanSettings();
            const tournamentStrategy =
                strategy ?? this.strategyFactory.create(tournament.configuration.competitionMode);
            return tournamentStrategy.computePlan(
                tournament,
                tournament.teams?.length ?? 0,
                settings,
            );
        } catch (error) {
            this.logger.error(`Plan computation failed for tournament ${tournament.code}`, error);
            return null;
        }
    }
}
