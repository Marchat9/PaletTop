import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from 'src/entities/team.entity';

@Injectable()
export class TeamRepository {
    constructor(
        @InjectRepository(Team)
        private readonly repo: Repository<Team>,
    ) {}

    save(teams: Team[]): Promise<Team[]> {
        return this.repo.save(teams);
    }

    create(data: Partial<Team>): Team {
        return this.repo.create(data);
    }

    findById(id: string): Promise<Team | null> {
        return this.repo.findOne({
            where: { id },
            relations: { players: { club: true }, tournament: true },
        });
    }

    async remove(team: Team): Promise<void> {
        await this.repo.remove(team);
    }
}
