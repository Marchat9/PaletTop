import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Training } from 'src/entities/training.entity';
import { AdminPasswordService } from 'src/modules/admin-password/admin-password.service';
import { TrainingRepository } from '../repositories/training.repository';

@Injectable()
export class TrainingAuthService {
    private readonly logger = new Logger(TrainingAuthService.name);

    constructor(
        private readonly trainingRepo: TrainingRepository,
        private readonly adminPassword: AdminPasswordService,
    ) {}

    /** Verifies the admin password against the stored hash, then loads the training. */
    async findWithAdminAuth(
        code: string,
        password: string,
        withMembers = false,
    ): Promise<Training> {
        const storedHash = await this.trainingRepo.findAdminPasswordHash(code);
        const training = (await this.adminPassword.verify(storedHash, password))
            ? await this.trainingRepo.findForAdmin(code, withMembers)
            : null;
        if (!training) {
            this.logger.warn(`Admin auth failed for training ${code}`);
            throw new NotFoundException('Entraînement introuvable ou mot de passe invalide');
        }
        return training;
    }
}
