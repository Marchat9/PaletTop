import { BadRequestException } from '@nestjs/common';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingSessionStatus } from 'src/enum/training.enum';

/**
 * Blocks the "session still alive" actions (check-in, teams, round generation, first score entry)
 * once the session is CLOSED. Deliberately left out of `validateMatch` (confirming a score already
 * recorded must not be lost if the closing - the automatic one in particular - happens before the
 * validation) and of `adminUpdateScore` (admin correction after the fact, mirroring the
 * `wasSessionClosed` behaviour already accepted on the tournament side).
 */
export function assertSessionOpen(session: TrainingSession): void {
    if (session.status === TrainingSessionStatus.CLOSED) {
        throw new BadRequestException('Cette session est clôturée.');
    }
}
