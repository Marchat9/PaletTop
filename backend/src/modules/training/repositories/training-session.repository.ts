import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { TrainingSession } from 'src/entities/training-session.entity';

@Injectable()
export class TrainingSessionRepository {
    constructor(
        @InjectRepository(TrainingSession)
        private readonly repo: Repository<TrainingSession>,
    ) {}

    create(data: Partial<TrainingSession>): TrainingSession {
        return this.repo.create(data);
    }

    save(session: Partial<TrainingSession>): Promise<TrainingSession> {
        return this.repo.save(session as TrainingSession);
    }

    async codeExists(code: string): Promise<boolean> {
        const count = await this.repo.countBy({ code });
        return count > 0;
    }

    findByCode(code: string): Promise<TrainingSession | null> {
        return this.repo.findOne({
            where: { code },
            relations: { training: true, participants: true },
        });
    }

    /**
     * Charge une session par son code après vérification du mot de passe admin de
     * l'entraînement PARENT (TrainingSession ne porte pas son propre mot de passe).
     */
    findWithTrainingAuth(sessionCode: string, password: string): Promise<TrainingSession | null> {
        return this.repo
            .createQueryBuilder('session')
            .innerJoinAndSelect('session.training', 'training')
            .leftJoinAndSelect('session.participants', 'participant')
            .where('session.code = :sessionCode', { sessionCode })
            .andWhere('training.adminPassword = :password', { password })
            .getOne();
    }

    touchLastActivity(sessionId: string): Promise<UpdateResult> {
        return this.repo.update(sessionId, { lastActivityAt: new Date() });
    }
}
