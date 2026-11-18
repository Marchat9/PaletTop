import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Subscription } from 'rxjs';
import { registerIdleCron, rescheduleIdleCron } from 'src/utils/register-idle-cron.util';
import { TrainingAutoCloseConfig } from 'src/config/training-auto-close.config';
import { AppSettingKey } from 'src/enum/app-setting.enum';
import { AppSettingsService } from 'src/modules/app-settings/app-settings.service';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { TrainingRoundRepository } from '../repositories/training-round.repository';
import { hasUnfinishedMatch } from '../utils/round-status.utils';
import { TrainingRoundStatus } from 'src/enum/training.enum';
import { TrainingRealtimeGateway } from '../training-realtime.gateway';
import { TrainingSession } from 'src/entities/training-session.entity';

const JOB_NAME = 'training-session-auto-close';

@Injectable()
export class TrainingAutoCloseService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TrainingAutoCloseService.name);
    private subscription?: Subscription;

    constructor(
        private readonly appSettingsService: AppSettingsService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly trainingRealtimeGateway: TrainingRealtimeGateway,
        private readonly trainingRoundRepo: TrainingRoundRepository,
    ) {}

    async onModuleInit(): Promise<void> {
        const config = await this.appSettingsService.get(AppSettingKey.TRAINING_AUTO_CLOSE);
        this.schedule(config, false);
        this.subscription = this.appSettingsService.watch(
            AppSettingKey.TRAINING_AUTO_CLOSE,
            (updated) => this.schedule(updated, true),
        );
    }

    onModuleDestroy(): void {
        this.subscription?.unsubscribe();
    }

    private schedule(config: TrainingAutoCloseConfig, isReschedule: boolean): void {
        const register = isReschedule ? rescheduleIdleCron : registerIdleCron;
        register(
            this.logger,
            this.schedulerRegistry,
            {
                enabled: config.enabled,
                cronExpression: config.cronExpression,
                jobName: JOB_NAME,
                disabledMessage: "Clôture automatique des sessions d'entraînement désactivée.",
                scheduledMessage: `Clôture automatique des sessions d'entraînement planifiée (cron: "${config.cronExpression}").`,
            },
            () => this.runAutoClose(),
        );
    }

    async runAutoClose(): Promise<void> {
        const config = await this.appSettingsService.get(AppSettingKey.TRAINING_AUTO_CLOSE);
        const expired = await this.trainingSessionRepo.findExpiredOpen(config.idleHours);
        if (!expired.length) return;

        const closable: TrainingSession[] = [];
        for (const session of expired) {
            try {
                if (await this.closeIdleSession(session)) {
                    closable.push(session);
                }
            } catch (error) {
                // Rolled back alone: the other sessions are still closed, this one is retried on
                // the next run.
                this.logger.error(`Auto-close failed for training session ${session.code}`, error);
            }
        }
        if (!closable.length) return;

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
     * The round and the session are closed together or not at all: a session left open with its
     * round closed could no longer be scored, without anything saying why.
     */
    @Transactional()
    private async closeIdleSession(session: TrainingSession): Promise<boolean> {
        if (!(await this.closeFinishedRound(session))) {
            return false;
        }
        await this.trainingSessionRepo.closeMany([session.id]);
        return true;
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
