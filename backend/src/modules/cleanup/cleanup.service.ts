import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { registerIdleCron } from 'src/common/scheduling/register-idle-cron.util';
import { CleanupConfig } from 'src/config/cleanup.config';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentRepository } from 'src/modules/tournaments/repositories/tournament.repository';

@Injectable()
export class CleanupService implements OnModuleInit {
    private readonly logger = new Logger(CleanupService.name);
    private readonly config: CleanupConfig;

    constructor(
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly tournamentRepo: TournamentRepository,
    ) {
        this.config = this.configService.getOrThrow<CleanupConfig>('cleanup');
    }

    onModuleInit(): void {
        registerIdleCron(
            this.logger,
            this.schedulerRegistry,
            {
                enabled: this.config.enabled,
                cronExpression: this.config.cronExpression,
                jobName: 'tournament-cleanup',
                disabledMessage:
                    'Nettoyage automatique des tournois désactivé (CLEANUP_ENABLED=false).',
                scheduledMessage: `Nettoyage automatique des tournois planifié (cron: "${this.config.cronExpression}").`,
            },
            () => void this.runCleanup(),
        );
    }

    async runCleanup(): Promise<void> {
        this.logger.log('==== Démarrage du nettoyage des tournois ====');

        if (this.config.completed.enabled) {
            await this.cleanupRule('terminés', () =>
                this.tournamentRepo.findExpiredCompleted(this.config.completed.retentionDays),
            );
        }

        if (this.config.draft.enabled) {
            await this.cleanupRule('brouillons', () =>
                this.tournamentRepo.findExpiredDrafts(
                    this.config.draft.retentionDays,
                    this.config.draft.maxFutureDays,
                ),
            );
        }

        if (this.config.active.enabled) {
            await this.cleanupRule('actifs', () =>
                this.tournamentRepo.findExpiredActive(this.config.active.retentionDays),
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
