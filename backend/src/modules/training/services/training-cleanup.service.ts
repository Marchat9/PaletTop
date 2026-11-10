import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { registerIdleCron } from 'src/utils/register-idle-cron.util';
import { TrainingCleanupConfig } from 'src/config/training-cleanup.config';
import { TrainingSessionRepository } from '../repositories/training-session.repository';

@Injectable()
export class TrainingCleanupService implements OnModuleInit {
    private readonly logger = new Logger(TrainingCleanupService.name);
    private readonly config: TrainingCleanupConfig;

    constructor(
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly trainingSessionRepo: TrainingSessionRepository,
    ) {
        this.config = this.configService.getOrThrow<TrainingCleanupConfig>('trainingCleanup');
    }

    onModuleInit(): void {
        registerIdleCron(
            this.logger,
            this.schedulerRegistry,
            {
                enabled: this.config.enabled,
                cronExpression: this.config.cronExpression,
                jobName: 'training-session-cleanup',
                disabledMessage:
                    "Nettoyage des sessions d'entraînement vides désactivé (TRAINING_CLEANUP_ENABLED=false).",
                scheduledMessage: `Nettoyage des sessions d'entraînement vides planifié (cron: "${this.config.cronExpression}").`,
            },
            () => this.runCleanup(),
        );
    }

    /** Deletes the sessions closed for a while without any participant or without any round. */
    async runCleanup(): Promise<void> {
        const empty = await this.trainingSessionRepo.findClosedWithoutParticipantOrRound(
            this.config.retentionDays,
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
