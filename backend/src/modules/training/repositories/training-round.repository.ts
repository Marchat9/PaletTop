import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { TrainingRound } from 'src/entities/training-round.entity';
import { TrainingRoundStatus } from 'src/enum/training.enum';

const MATCH_TEAM_RELATIONS = {
    matches: {
        teamA: { members: { participant: true } },
        teamB: { members: { participant: true } },
    },
} as const;

@Injectable()
export class TrainingRoundRepository {
    constructor(
        @InjectRepository(TrainingRound)
        private readonly repo: Repository<TrainingRound>,
    ) {}

    create(data: Partial<TrainingRound>): TrainingRound {
        return this.repo.create(data);
    }

    save(round: Partial<TrainingRound>): Promise<TrainingRound> {
        return this.repo.save(round as TrainingRound);
    }

    findLatestBySession(sessionId: string): Promise<TrainingRound | null> {
        return this.repo.findOne({
            where: { session: { id: sessionId } },
            order: { roundNumber: 'DESC', matches: { createdAt: 'ASC' } },
            relations: MATCH_TEAM_RELATIONS,
        });
    }

    findBySessionAndNumber(sessionId: string, roundNumber: number): Promise<TrainingRound | null> {
        return this.repo.findOne({
            where: { session: { id: sessionId }, roundNumber },
            order: { matches: { createdAt: 'ASC' } },
            relations: MATCH_TEAM_RELATIONS,
        });
    }

    closeRound(roundId: string): Promise<UpdateResult> {
        return this.repo.update(roundId, { status: TrainingRoundStatus.CLOSED });
    }

    findAllBySession(sessionId: string): Promise<TrainingRound[]> {
        return this.repo.find({
            where: { session: { id: sessionId } },
            order: { roundNumber: 'ASC', matches: { createdAt: 'ASC' } },
            relations: MATCH_TEAM_RELATIONS,
        });
    }
}
