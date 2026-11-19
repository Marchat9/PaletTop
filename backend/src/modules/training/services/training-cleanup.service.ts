import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Subscription } from 'rxjs';
import { registerIdleCron, rescheduleIdleCron } from 'src/utils/register-idle-cron.util';
import { TrainingCleanupConfig } from 'src/config/training-cleanup.config';
import { AppSettingKey } from 'src/enum/app-setting.enum';
import { AppSettingsService } from 'src/modules/app-settings/app-settings.service';
import { TrainingSessionRepository } from '../repositories/training-session.repository';

const JOB_NAME = 'training-session-cleanup';

@Injectable()
export class TrainingCleanupService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TrainingCleanupService.name);
    private subscription?: Subscription;

    constructor(
        private readonly appSettingsService: AppSettingsService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly trainingSessionRepo: TrainingSessionRepository,
    ) {}

    async onModuleInit(): Promise<void> {
        const config = await this.appSettingsService.get(AppSettingKey.TRAINING_CLEANUP);
        this.schedule(config, false);
        this.subscription = this.appSettingsService.watch(
            AppSettingKey.TRAINING_CLEANUP,
            (updated) => this.schedule(updated, true),
        );
    }

    onModuleDestroy(): void {
        this.subscription?.unsubscribe();
    }

    private schedule(config: TrainingCleanupConfig, isReschedule: boolean): void {
        const register = isReschedule ? rescheduleIdleCron : registerIdleCron;
        register(
            this.logger,
            this.schedulerRegistry,
            {
                enabled: config.enabled,
                cronExpression: config.cronExpression,
                jobName: JOB_NAME,
                disabledMessage: "Nettoyage des sessions d'entraînement vides désactivé.",
                scheduledMessage: `Nettoyage des sessions d'entraînement vides planifié (cron: "${config.cronExpression}").`,
            },
            () => this.runCleanup(),
        );
    }

    /** Deletes the sessions closed for a while without any participant or without any round. */
    async runCleanup(): Promise<void> {
        const config = await this.appSettingsService.get(AppSettingKey.TRAINING_CLEANUP);
        const empty = await this.trainingSessionRepo.findClosedWithoutParticipantOrRound(
            config.retentionDays,
        );
        if (!empty.length) {
            this.logger.log("Aucune session d'entraînement vide à supprimer");
            return;
        }

        await this.trainingSessionRepo.deleteMany(empty.map((session) => session.id));
        this.logger.log(
            `${empty.length} session(s) d'entraînement clôturée(s) sans joueur ou sans round supprimée(s) : [${empty
                .map((session) => session.code)
                .join(', ')}]`,
        );
    }
}
