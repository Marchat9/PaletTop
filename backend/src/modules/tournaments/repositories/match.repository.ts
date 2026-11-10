import { Injectable } from '@nestjs/common';
import { ExpectedScore } from 'src/utils/score-conflict.util';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { MatchStatus } from 'src/enum/status.enum';
import { TournamentMatch } from 'src/entities/tounament-match.entity';

@Injectable()
export class MatchRepository {
    constructor(
        @InjectRepository(TournamentMatch)
        private readonly repo: Repository<TournamentMatch>,
    ) {}

    findByIdInTournament(matchId: string, tournamentId: string): Promise<TournamentMatch | null> {
        return this.repo.findOne({
            where: { id: matchId, tournament: { id: tournamentId } },
            relations: { teamA: true, teamB: true, pool: true, session: true },
        });
    }

    findByIdWithSession(matchId: string): Promise<TournamentMatch | null> {
        return this.repo.findOne({
            where: { id: matchId },
            relations: { teamA: true, teamB: true, pool: true, session: true },
        });
    }

    findByPool(poolId: string): Promise<TournamentMatch[]> {
        return this.repo.find({
            where: { pool: { id: poolId } },
            relations: { teamA: true, teamB: true },
        });
    }

    async update(matchId: string, data: Partial<TournamentMatch>): Promise<void> {
        await this.repo.update(matchId, data);
    }

    /**
     * Writes only if the match is still in one of the expected statuses, in the same statement: a
     * read then a write would let a concurrent validation slip in between. Returns whether the
     * match was updated.
     */
    // With an expected score, the score must not have changed either (checked in the same query).
    async updateIfStatus(
        matchId: string,
        expected: MatchStatus[],
        data: Partial<TournamentMatch>,
        expectedScore: ExpectedScore | null = null,
    ): Promise<boolean> {
        const result = await this.repo.update(
            { id: matchId, status: In(expected), ...expectedScore },
            data,
        );
        return (result.affected ?? 0) > 0;
    }

    save(matches: DeepPartial<TournamentMatch>[]): Promise<TournamentMatch[]> {
        return this.repo.save(matches);
    }

    create(data: DeepPartial<TournamentMatch>): TournamentMatch {
        return this.repo.create(data);
    }
}
