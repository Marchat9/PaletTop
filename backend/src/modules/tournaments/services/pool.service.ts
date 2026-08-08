import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Team } from 'src/entities/team.entity';
import { shuffleFisherYates } from 'src/modules/tournaments/utils/global.utils';

@Injectable()
export class PoolService {
    constructor(
        @InjectRepository(TournamentPool)
        private readonly poolRepository: Repository<TournamentPool>,
        @InjectRepository(Team)
        private readonly teamRepository: Repository<Team>,
    ) {}

    async assignTeamsToPools(
        tournament: Tournament,
        numberOfPools: number | undefined | null,
    ): Promise<TournamentPool[]> {
        numberOfPools = numberOfPools ?? 1;
        const teams = shuffleFisherYates([...tournament.teams]);

        const poolDrafts = Array.from({ length: numberOfPools }, (_, i) =>
            this.poolRepository.create({ tournament, poolNumber: i + 1 }),
        );
        const savedPools = await this.poolRepository.save(poolDrafts);

        teams.forEach((team, i) => (team.pool = savedPools[i % numberOfPools]));
        await this.teamRepository.save(teams);

        return savedPools.map((pool) => ({
            ...pool,
            teams: teams.filter((t) => t.pool?.id === pool.id),
        }));
    }
}
