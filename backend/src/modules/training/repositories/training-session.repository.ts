import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository, UpdateResult } from 'typeorm';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingSessionStatus } from 'src/enum/training.enum';

const FIXED_TEAM_JOIN_CONDITION = 'team.round_id IS NULL';

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
        return this.repo
            .createQueryBuilder('session')
            .innerJoinAndSelect('session.training', 'training')
            .leftJoinAndSelect('session.participants', 'participant')
            .leftJoinAndSelect('participant.member', 'participantMember')
            .leftJoinAndSelect('session.teams', 'team', FIXED_TEAM_JOIN_CONDITION)
            .leftJoinAndSelect('team.members', 'teamMember')
            .leftJoinAndSelect('teamMember.participant', 'teamMemberParticipant')
            .where('session.code = :code', { code })
            .getOne();
    }

    async findByCodeOrThrow(code: string): Promise<TrainingSession> {
        const session = await this.findByCode(code);
        if (!session) {
            throw new NotFoundException('Session introuvable.');
        }
        return session;
    }

    findWithTrainingAuth(sessionCode: string, password: string): Promise<TrainingSession | null> {
        return this.repo
            .createQueryBuilder('session')
            .innerJoinAndSelect('session.training', 'training')
            .leftJoinAndSelect('session.participants', 'participant')
            .leftJoinAndSelect('participant.member', 'participantMember')
            .leftJoinAndSelect('session.teams', 'team', FIXED_TEAM_JOIN_CONDITION)
            .leftJoinAndSelect('team.members', 'teamMember')
            .leftJoinAndSelect('teamMember.participant', 'teamMemberParticipant')
            .where('session.code = :sessionCode', { sessionCode })
            .andWhere('training.adminPassword = :password', { password })
            .getOne();
    }

    touchLastActivity(sessionId: string): Promise<UpdateResult> {
        return this.repo.update(sessionId, { lastActivityAt: new Date() });
    }

    // A targeted .update() on purpose, not repo.save(session): the session loaded by
    // findWithTrainingAuth() carries a graph of relations (teams/members) whose inverse side
    // (team.session) is not hydrated - a save() would cascade and write session_id = NULL on those
    // teams (NOT NULL violation, seen under load test).
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

    findAllByIdsWithRelations(ids: string[]): Promise<TrainingSession[]> {
        if (!ids.length) return Promise.resolve([]);
        return this.repo
            .createQueryBuilder('session')
            .innerJoinAndSelect('session.training', 'training')
            .leftJoinAndSelect('session.participants', 'participant')
            .leftJoinAndSelect('participant.member', 'participantMember')
            .leftJoinAndSelect('session.teams', 'team', FIXED_TEAM_JOIN_CONDITION)
            .leftJoinAndSelect('team.members', 'teamMember')
            .leftJoinAndSelect('teamMember.participant', 'teamMemberParticipant')
            .where('session.id IN (:...ids)', { ids })
            .getMany();
    }

    findAllByTraining(trainingId: string): Promise<TrainingSession[]> {
        return this.repo
            .createQueryBuilder('session')
            .leftJoinAndSelect('session.participants', 'participant')
            .where('session.training_id = :trainingId', { trainingId })
            .orderBy('session.date', 'DESC')
            .getMany();
    }

    /** Ids of the most recent sessions of a training (most recent first), excluding one. */
    async findRecentIdsByTraining(
        trainingId: string,
        excludeSessionId: string,
        limit: number,
    ): Promise<string[]> {
        if (limit <= 0) {
            return [];
        }
        const rows = await this.repo
            .createQueryBuilder('session')
            .select('session.id', 'id')
            .where('session.training_id = :trainingId', { trainingId })
            .andWhere('session.id != :excludeSessionId', { excludeSessionId })
            .orderBy('session.date', 'DESC')
            .addOrderBy('session.createdAt', 'DESC')
            .limit(limit)
            .getRawMany<{ id: string }>();
        return rows.map((row) => row.id);
    }
}
