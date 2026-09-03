import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingSessionRepository } from '../repositories/training-session.repository';

@Injectable()
export class TrainingSessionAuthService {
    private readonly logger = new Logger(TrainingSessionAuthService.name);

    constructor(private readonly trainingSessionRepo: TrainingSessionRepository) {}

    async findWithAdminAuth(sessionCode: string, password: string): Promise<TrainingSession> {
        const session = await this.trainingSessionRepo.findWithTrainingAuth(sessionCode, password);
        if (!session) {
            this.logger.warn(`Admin auth failed for training session ${sessionCode}`);
            throw new NotFoundException('Session introuvable ou mot de passe invalide.');
        }
        return session;
    }
}
