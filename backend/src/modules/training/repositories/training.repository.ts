import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Training } from 'src/entities/training.entity';

@Injectable()
export class TrainingRepository {
    constructor(
        @InjectRepository(Training)
        private readonly repo: Repository<Training>,
    ) {}

    create(data: Partial<Training>): Training {
        return this.repo.create(data);
    }

    save(training: Partial<Training>): Promise<Training> {
        return this.repo.save(training as Training);
    }

    findByCode(code: string): Promise<Training | null> {
        return this.repo.findOneBy({ code });
    }

    /**
     * Charge un entraînement après vérification du mot de passe admin.
     * Retourne null si l'entraînement est introuvable ou si le mot de passe est incorrect.
     */
    findWithAuth(code: string, password: string, withMembers = false): Promise<Training | null> {
        const queryBuilder = this.repo
            .createQueryBuilder('training')
            .where('training.code = :code', { code })
            .andWhere('training.adminPassword = :password', { password });

        if (withMembers) {
            queryBuilder.leftJoinAndSelect('training.members', 'member');
        }

        return queryBuilder.getOne();
    }
}
