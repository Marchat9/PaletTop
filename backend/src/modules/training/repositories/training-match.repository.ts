import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainingMatch } from 'src/entities/training-match.entity';

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
}
