import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
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

    findByTournament(tournamentId: string): Promise<TournamentMatch[]> {
        return this.repo.find({
            where: { tournament: { id: tournamentId } },
            relations: { teamA: true, teamB: true, pool: true },
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

    save(matches: DeepPartial<TournamentMatch>[]): Promise<TournamentMatch[]> {
        return this.repo.save(matches);
    }

    create(data: DeepPartial<TournamentMatch>): TournamentMatch {
        return this.repo.create(data);
    }
}
