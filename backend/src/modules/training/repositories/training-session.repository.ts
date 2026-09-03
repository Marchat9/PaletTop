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
        // Seules les équipes FIXED (round IS NULL) sont chargées ici : les équipes éphémères
        // d'un round passé se consultent via le détail de ce round (Phase 6), pas ici.
        return this.repo
            .createQueryBuilder('session')
            .innerJoinAndSelect('session.training', 'training')
            .leftJoinAndSelect('session.participants', 'participant')
            .leftJoinAndSelect('session.teams', 'team', 'team.round_id IS NULL')
            .leftJoinAndSelect('team.members', 'teamMember')
            .leftJoinAndSelect('teamMember.participant', 'teamMemberParticipant')
            .where('session.code = :code', { code })
            .getOne();
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
            .leftJoinAndSelect('session.teams', 'team', 'team.round_id IS NULL')
            .leftJoinAndSelect('team.members', 'teamMember')
            .leftJoinAndSelect('teamMember.participant', 'teamMemberParticipant')
            .where('session.code = :sessionCode', { sessionCode })
            .andWhere('training.adminPassword = :password', { password })
            .getOne();
    }

    touchLastActivity(sessionId: string): Promise<UpdateResult> {
        return this.repo.update(sessionId, { lastActivityAt: new Date() });
    }
}
