import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { TrainingAutoCloseConfig } from 'src/config/training-auto-close.config';
import { TrainingSessionRepository } from '../repositories/training-session.repository';

@Injectable()
export class TrainingAutoCloseService implements OnModuleInit {
    private readonly logger = new Logger(TrainingAutoCloseService.name);
    private readonly config: TrainingAutoCloseConfig;

    constructor(
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly trainingSessionRepo: TrainingSessionRepository,
    ) {
        this.config = this.configService.getOrThrow<TrainingAutoCloseConfig>('trainingAutoClose');
    }

    // Pas de ScheduleModule.forRoot() ici : ce module est @Global() et déjà initialisé par
    // CleanupModule dans AppModule — injecter SchedulerRegistry suffit.
    onModuleInit(): void {
        if (!this.config.enabled) {
            this.logger.debug(
                "Clôture automatique des sessions d'entraînement désactivée (TRAINING_AUTOCLOSE_ENABLED=false).",
            );
            return;
        }

        const job = new CronJob(this.config.cronExpression, () => {
            void this.runAutoClose();
        });
        this.schedulerRegistry.addCronJob('training-session-auto-close', job);
        job.start();
        this.logger.log(
            `Clôture automatique des sessions d'entraînement planifiée (cron: "${this.config.cronExpression}").`,
        );
    }

    async runAutoClose(): Promise<void> {
        const expired = await this.trainingSessionRepo.findExpiredOpen(this.config.idleHours);
        if (!expired.length) return;

        await this.trainingSessionRepo.closeMany(expired.map((s) => s.id));
        this.logger.log(
            `${expired.length} session(s) d'entraînement clôturée(s) automatiquement : [${expired
                .map((s) => s.code)
                .join(', ')}]`,
        );
    }
}
