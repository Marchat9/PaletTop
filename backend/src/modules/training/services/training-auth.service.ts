import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Training } from 'src/entities/training.entity';
import { TrainingRepository } from '../repositories/training.repository';

@Injectable()
export class TrainingAuthService {
    private readonly logger = new Logger(TrainingAuthService.name);

    constructor(private readonly trainingRepo: TrainingRepository) {}

    async findWithAdminAuth(
        code: string,
        password: string,
        withMembers = false,
    ): Promise<Training> {
        const training = await this.trainingRepo.findWithAuth(code, password, withMembers);
        if (!training) {
            this.logger.warn(`Admin auth failed for training ${code}`);
            throw new NotFoundException('Entraînement introuvable ou mot de passe invalide');
        }
        return training;
    }
}
