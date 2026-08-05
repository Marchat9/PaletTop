import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Team } from 'src/entities/team.entity';

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
        const teams = this.shuffleFisherYates([...tournament.teams]);

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

    // Mélange aléatoire non-biaisé : chaque élément a une probabilité égale d'atterrir à n'importe quelle position.
    // Fonctionne en parcourant le tableau de la fin vers le début et en échangeant chaque élément
    // avec un élément choisi aléatoirement parmi ceux qui le précèdent (lui inclus).
    private shuffleFisherYates<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.min(Math.floor(Math.random() * (i + 1)), i);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}
