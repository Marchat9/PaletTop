import { Injectable, Logger } from '@nestjs/common';
import { Tournament } from 'src/entities/tournament.entity';
import { AppSettingKey } from 'src/enum/app-setting.enum';
import { AppSettingsService } from 'src/modules/app-settings/app-settings.service';
import { PlanSettings, TournamentStrategy } from '../strategies/tournament-strategy.abstract';
import { TournamentStrategyFactory } from '../strategies/tournament-strategy.factory';
import { TournamentPlan } from '../strategies/structured/plan/plan.types';

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
