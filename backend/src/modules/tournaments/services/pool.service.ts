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

        // `tournament` is stubbed to its id here — embedding the full entity would make
        // `pool.tournament.teams` point back to these same teams once `team.pool` is set
        // below, and that cycle blows the call stack the moment a match carrying the full
        // team entity (team.pool.tournament.teams...) is passed to matchRepo.create().
        const poolDrafts = Array.from({ length: numberOfPools }, (_, i) =>
            this.poolRepository.create({
                tournament: { id: tournament.id } as Tournament,
                poolNumber: i + 1,
            }),
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
