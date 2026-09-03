import { BadRequestException } from '@nestjs/common';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingSessionStatus } from 'src/enum/training.enum';

/**
 * Bloque les actions "session encore vivante" (check-in, équipes, génération de round, saisie
 * initiale de score) une fois la session CLOSED. Exclu volontairement de `validateMatch` (confirmer
 * un score déjà enregistré ne doit pas se perdre si la clôture — notamment automatique — tombe
 * avant validation) et de `adminUpdateScore` (correction admin a posteriori, mirror du
 * comportement `wasSessionClosed` déjà accepté côté tournoi).
 */
export function assertSessionOpen(session: TrainingSession): void {
    if (session.status === TrainingSessionStatus.CLOSED) {
        throw new BadRequestException('Cette session est clôturée.');
    }
}
