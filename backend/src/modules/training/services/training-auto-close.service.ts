import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { registerIdleCron } from 'src/utils/register-idle-cron.util';
import { TrainingAutoCloseConfig } from 'src/config/training-auto-close.config';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { TrainingRoundRepository } from '../repositories/training-round.repository';
import { hasUnfinishedMatch } from '../utils/round-status.utils';
import { TrainingRoundStatus } from 'src/enum/training.enum';
import { TrainingRealtimeGateway } from '../training-realtime.gateway';
import { TrainingSession } from 'src/entities/training-session.entity';

@Injectable()
export class TrainingAutoCloseService implements OnModuleInit {
    private readonly logger = new Logger(TrainingAutoCloseService.name);
    private readonly config: TrainingAutoCloseConfig;

    constructor(
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly trainingRealtimeGateway: TrainingRealtimeGateway,
        private readonly trainingRoundRepo: TrainingRoundRepository,
    ) {
        this.config = this.configService.getOrThrow<TrainingAutoCloseConfig>('trainingAutoClose');
    }

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
            () => this.runAutoClose(),
        );
    }

    async runAutoClose(): Promise<void> {
        const expired = await this.trainingSessionRepo.findExpiredOpen(this.config.idleHours);
        if (!expired.length) return;

        const closable: TrainingSession[] = [];
        for (const session of expired) {
            if (await this.closeFinishedRound(session)) {
                closable.push(session);
            }
        }
        if (!closable.length) return;

        await this.trainingSessionRepo.closeMany(closable.map((s) => s.id));
        this.logger.log(
            `${closable.length} session(s) d'entraînement clôturée(s) automatiquement : [${closable
                .map((s) => s.code)
                .join(', ')}]`,
        );

        const reloaded = await this.trainingSessionRepo.findAllByIdsWithRelations(
            closable.map((s) => s.id),
        );
        for (const session of reloaded) {
            this.trainingRealtimeGateway.emitSessionUpdatedFrom(session);
        }
    }

    /**
     * Whether the idle session can be closed. With every round closed, it can. With a round in
     * progress whose matches are all validated, that round is closed first. With a match still
     * unvalidated, the round and the session are both left open.
     */
    private async closeFinishedRound(session: TrainingSession): Promise<boolean> {
        const round = await this.trainingRoundRepo.findLatestBySession(session.id);
        if (!round || round.status !== TrainingRoundStatus.OPEN) {
            return true;
        }
        if (hasUnfinishedMatch(round)) {
            this.logger.log(
                `Session ${session.code} laissée ouverte : des matchs du round ${round.roundNumber} ne sont pas validés`,
            );
            return false;
        }
        await this.trainingRoundRepo.closeRound(round.id);
        this.logger.log(`Round ${round.roundNumber} de la session ${session.code} clôturé`);
        return true;
    }
}
