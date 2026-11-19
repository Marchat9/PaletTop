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
        this.logger.log('==== Démarrage du nettoyage des tournois ====');

        if (config.completed.enabled) {
            await this.cleanupRule('terminés', () =>
                this.tournamentRepo.findExpiredCompleted(config.completed.retentionDays),
            );
        }

        if (config.draft.enabled) {
            await this.cleanupRule('brouillons', () =>
                this.tournamentRepo.findExpiredDrafts(
                    config.draft.retentionDays,
                    config.draft.maxFutureDays,
                ),
            );
        }

        if (config.active.enabled) {
            await this.cleanupRule('actifs', () =>
                this.tournamentRepo.findExpiredActive(config.active.retentionDays),
            );
        }

        this.logger.log('==== Fin du nettoyage des tournois ====');
    }

    private async cleanupRule(label: string, find: () => Promise<Tournament[]>): Promise<void> {
        const expired = await find();
        if (!expired.length) return;

        await this.tournamentRepo.deleteMany(expired.map((tournament) => tournament.id));
        this.logger.log(
            `${expired.length} tournoi(s) ${label} supprimé(s) : [${expired
                .map((tournament) => tournament.code)
                .join(', ')}]`,
        );
    }
}
