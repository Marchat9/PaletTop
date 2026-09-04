import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository, UpdateResult } from 'typeorm';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingSessionStatus } from 'src/enum/training.enum';

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
            .leftJoinAndSelect('participant.member', 'participantMember')
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
            .leftJoinAndSelect('participant.member', 'participantMember')
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

    // Volontairement un .update() ciblé et non repo.save(session) : la session chargée par
    // findWithTrainingAuth() porte un graphe de relations (teams/members) dont le côté inverse
    // (team.session) n'est pas hydraté — un save() cascaderait et écrirait session_id = NULL sur
    // ces équipes (violation de contrainte NOT NULL, cf. bug constaté en test de charge).
    closeSession(sessionId: string, closedAt: Date): Promise<UpdateResult> {
        return this.repo.update(sessionId, { status: TrainingSessionStatus.CLOSED, closedAt });
    }

    findExpiredOpen(idleHours: number): Promise<TrainingSession[]> {
        const threshold = new Date();
        threshold.setHours(threshold.getHours() - idleHours);
        return this.repo.find({
            where: { status: TrainingSessionStatus.OPEN, lastActivityAt: LessThan(threshold) },
        });
    }

    async closeMany(ids: string[]): Promise<void> {
        if (!ids.length) return;
        await this.repo.update(ids, { status: TrainingSessionStatus.CLOSED, closedAt: new Date() });
    }

    findAllByTraining(trainingId: string): Promise<TrainingSession[]> {
        return this.repo
            .createQueryBuilder('session')
            .leftJoinAndSelect('session.participants', 'participant')
            .where('session.training_id = :trainingId', { trainingId })
            .orderBy('session.date', 'DESC')
            .getMany();
    }
}
