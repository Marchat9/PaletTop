import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TrainingMatch } from 'src/entities/training-match.entity';
import { MatchStatus } from 'src/enum/status.enum';

const FULL_TEAM_RELATIONS = {
    round: true,
    teamA: { members: { participant: true } },
    teamB: { members: { participant: true } },
} as const;

@Injectable()
export class TrainingMatchRepository {
    constructor(
        @InjectRepository(TrainingMatch)
        private readonly repo: Repository<TrainingMatch>,
    ) {}

    create(data: Partial<TrainingMatch>): TrainingMatch {
        return this.repo.create(data);
    }

    save(matches: Partial<TrainingMatch>[]): Promise<TrainingMatch[]> {
        return this.repo.save(matches as TrainingMatch[]);
    }

    findByIdInSession(matchId: string, sessionId: string): Promise<TrainingMatch | null> {
        return this.repo.findOne({
            where: { id: matchId, session: { id: sessionId } },
            relations: FULL_TEAM_RELATIONS,
        });
    }

    findValidatedBySession(sessionId: string): Promise<TrainingMatch[]> {
        return this.repo.find({
            where: { session: { id: sessionId }, status: MatchStatus.VALIDATED },
            relations: FULL_TEAM_RELATIONS,
        });
    }

    /**
     * Deux requêtes plutôt qu'un seul query builder joint : filtrer sur teamA/teamB.members via
     * un JOIN direct puis réutiliser `.find()` pour recharger proprement les relations profondes
     * (comme TournamentRepository.findWithAuth, pour éviter un produit croisé de lignes).
     */
    async findByParticipant(sessionId: string, participantId: string): Promise<TrainingMatch[]> {
        const rows = await this.repo
            .createQueryBuilder('match')
            .select('match.id', 'id')
            .leftJoin('match.teamA', 'teamA')
            .leftJoin('teamA.members', 'teamAMember')
            .leftJoin('match.teamB', 'teamB')
            .leftJoin('teamB.members', 'teamBMember')
            .where('match.session_id = :sessionId', { sessionId })
            .andWhere(
                '(teamAMember.participant_id = :participantId OR teamBMember.participant_id = :participantId)',
                { participantId },
            )
            .orderBy('match.createdAt', 'ASC')
            .getRawMany<{ id: string }>();

        if (!rows.length) return [];

        const matches = await this.repo.find({
            where: { id: In(rows.map((r) => r.id)) },
            relations: FULL_TEAM_RELATIONS,
        });

        const order = new Map(rows.map((r, i) => [r.id, i]));
        return matches.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
}
