import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainingTeam } from 'src/entities/training-team.entity';

@Injectable()
export class TrainingTeamRepository {
    constructor(
        @InjectRepository(TrainingTeam)
        private readonly repo: Repository<TrainingTeam>,
    ) {}

    create(data: Partial<TrainingTeam>): TrainingTeam {
        return this.repo.create(data);
    }

    save(team: Partial<TrainingTeam>): Promise<TrainingTeam> {
        return this.repo.save(team as TrainingTeam);
    }
}
