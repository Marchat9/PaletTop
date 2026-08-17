import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TournamentPool } from 'src/entities/tournament-pool.entity';

@Injectable()
export class PoolRepository {
    constructor(
        @InjectRepository(TournamentPool)
        private readonly repo: Repository<TournamentPool>,
    ) {}

    findByIdWithTeams(poolId: string): Promise<TournamentPool | null> {
        return this.repo.findOne({
            where: { id: poolId },
            relations: { teams: true },
        });
    }

    findVirtualPoolByName(tournamentId: string, name: string): Promise<TournamentPool | null> {
        return this.repo.findOne({ where: { tournament: { id: tournamentId }, name } });
    }

    create(data: Partial<TournamentPool>): TournamentPool {
        return this.repo.create(data);
    }

    save(pool: Partial<TournamentPool>): Promise<TournamentPool> {
        return this.repo.save(pool as TournamentPool);
    }
}
