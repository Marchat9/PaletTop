import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Subscription } from 'rxjs';
import { registerIdleCron, rescheduleIdleCron } from 'src/utils/register-idle-cron.util';
import { CleanupConfig } from 'src/config/cleanup.config';
import { Tournament } from 'src/entities/tournament.entity';
import { AppSettingKey } from 'src/enum/app-setting.enum';
import { AppSettingsService } from 'src/modules/app-settings/app-settings.service';
import { TournamentRepository } from 'src/modules/tournaments/repositories/tournament.repository';

const JOB_NAME = 'tournament-cleanup';

import {
    activeDetail,
    completedDetail,
    draftDetail,
    TournamentCleanupGroup,
    tournamentCleanupLogLines,
} from './cleanup-log.utils';
@Injectable()
export class CleanupService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CleanupService.name);
    private subscription?: Subscription;

    constructor(
        private readonly appSettingsService: AppSettingsService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly tournamentRepo: TournamentRepository,
    ) {}

    async onModuleInit(): Promise<void> {
        const config = await this.appSettingsService.get(AppSettingKey.TOURNAMENT_CLEANUP);
        this.schedule(config, false);
        // The super-admin may change the schedule at runtime: the job follows without a restart.
        this.subscription = this.appSettingsService.watch(
            AppSettingKey.TOURNAMENT_CLEANUP,
            (updated) => this.schedule(updated, true),
        );
    }

    onModuleDestroy(): void {
        this.subscription?.unsubscribe();
    }

    private schedule(config: CleanupConfig, isReschedule: boolean): void {
        const register = isReschedule ? rescheduleIdleCron : registerIdleCron;
        register(
            this.logger,
            this.schedulerRegistry,
            {
                enabled: config.enabled,
                cronExpression: config.cronExpression,
                jobName: JOB_NAME,
                disabledMessage: 'Nettoyage automatique des tournois désactivé.',
                scheduledMessage: `Nettoyage automatique des tournois planifié (cron: "${config.cronExpression}").`,
            },
            () => this.runCleanup(),
        );
    }

    async runCleanup(): Promise<void> {
        // Read on each run: rule toggles and retention days changed meanwhile apply right away.
        const config = await this.appSettingsService.get(AppSettingKey.TOURNAMENT_CLEANUP);
        const groups: TournamentCleanupGroup[] = [];

        if (config.completed.enabled) {
            groups.push({
                rule: `Terminé depuis plus de ${config.completed.retentionDays} j`,
                tournaments: await this.cleanupRule(() =>
                    this.tournamentRepo.findExpiredCompleted(config.completed.retentionDays),
                ),
                detail: completedDetail,
            });
        }

        if (config.draft.enabled) {
            groups.push({
                rule: `Brouillon de plus de ${config.draft.retentionDays} j prévu dans plus de ${config.draft.maxFutureDays} j ou avant sa création`,
                tournaments: await this.cleanupRule(() =>
                    this.tournamentRepo.findExpiredDrafts(
                        config.draft.retentionDays,
                        config.draft.maxFutureDays,
                    ),
                ),
                detail: draftDetail,
            });
        }

        if (config.active.enabled) {
            groups.push({
                rule: `Actif depuis plus de ${config.active.retentionDays} j`,
                tournaments: await this.cleanupRule(() =>
                    this.tournamentRepo.findExpiredActive(config.active.retentionDays),
                ),
                detail: activeDetail,
            });
        }

        for (const line of tournamentCleanupLogLines(groups)) {
            this.logger.log(line);
        }
    }

    /** Deletes the tournaments one rule found, and returns them for the log. */
    private async cleanupRule(find: () => Promise<Tournament[]>): Promise<Tournament[]> {
        const expired = await find();
        if (expired.length) {
            await this.tournamentRepo.deleteMany(expired.map((tournament) => tournament.id));
        }
        return expired;
    }
}
