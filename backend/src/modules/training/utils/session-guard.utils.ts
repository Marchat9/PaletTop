import { BadRequestException, Logger } from '@nestjs/common';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingSessionStatus } from 'src/enum/training.enum';

/**
 * Blocks the "session still alive" actions (check-in, teams, round generation, score entry, admin
 * score correction) once the session is CLOSED: its results, club leaderboard included, are final.
 * Deliberately left out of `validateMatch`: confirming a score already recorded must not be lost if
 * the closing happens before the validation.
 */
export function assertSessionOpen(session: TrainingSession, logger: Logger, action: string): void {
    if (session.status === TrainingSessionStatus.CLOSED) {
        logger.warn(`${action} refused: training session ${session.code} is closed`);
        throw new BadRequestException('Cette séance est clôturée.');
    }
}
