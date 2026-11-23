import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TrainingSession } from 'src/entities/training-session.entity';
import { AdminPasswordService } from 'src/modules/admin-password/admin-password.service';
import { TrainingSessionRepository } from '../repositories/training-session.repository';

@Injectable()
export class TrainingSessionAuthService {
    private readonly logger = new Logger(TrainingSessionAuthService.name);

    constructor(
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly adminPassword: AdminPasswordService,
    ) {}

    /** Verifies the training admin password against the stored hash, then loads the session. */
    async findWithAdminAuth(sessionCode: string, password: string): Promise<TrainingSession> {
        const storedHash =
            await this.trainingSessionRepo.findTrainingAdminPasswordHash(sessionCode);
        const session = (await this.adminPassword.verify(storedHash, password))
            ? await this.trainingSessionRepo.findForAdmin(sessionCode)
            : null;
        if (!session) {
            this.logger.warn(`Admin auth failed for training session ${sessionCode}`);
            throw new NotFoundException('Séance introuvable ou mot de passe invalide.');
        }
        return session;
    }
}
