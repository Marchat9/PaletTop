import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { registerIdleCron } from 'src/common/scheduling/register-idle-cron.util';
import { TrainingAutoCloseConfig } from 'src/config/training-auto-close.config';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { toTrainingSessionPublicDto } from '../responses/training-session.dto';
import { TrainingRealtimeGateway } from '../training-realtime.gateway';

@Injectable()
export class TrainingAutoCloseService implements OnModuleInit {
    private readonly logger = new Logger(TrainingAutoCloseService.name);
    private readonly config: TrainingAutoCloseConfig;

    constructor(
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly trainingRealtimeGateway: TrainingRealtimeGateway,
    ) {
        this.config = this.configService.getOrThrow<TrainingAutoCloseConfig>('trainingAutoClose');
    }

    // Pas de ScheduleModule.forRoot() ici : il est enregistré une seule fois dans AppModule (module
    // @Global()) — injecter SchedulerRegistry suffit, sans dépendre d'un autre module métier.
    onModuleInit(): void {
        registerIdleCron(
            this.logger,
            this.schedulerRegistry,
            {
                enabled: this.config.enabled,
                cronExpression: this.config.cronExpression,
                jobName: 'training-session-auto-close',
                disabledMessage:
                    "Clôture automatique des sessions d'entraînement désactivée (TRAINING_AUTOCLOSE_ENABLED=false).",
                scheduledMessage: `Clôture automatique des sessions d'entraînement planifiée (cron: "${this.config.cronExpression}").`,
            },
            () => void this.runAutoClose(),
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

        const reloaded = await this.trainingSessionRepo.findAllByIdsWithRelations(
            expired.map((s) => s.id),
        );
        for (const session of reloaded) {
            this.trainingRealtimeGateway.emitSessionUpdated(
                session.code,
                toTrainingSessionPublicDto(session),
            );
        }
    }
}
