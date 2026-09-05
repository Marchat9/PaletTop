import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainingParticipant } from 'src/entities/training-participant.entity';

@Injectable()
export class TrainingParticipantRepository {
    constructor(
        @InjectRepository(TrainingParticipant)
        private readonly repo: Repository<TrainingParticipant>,
    ) {}

    create(data: Partial<TrainingParticipant>): TrainingParticipant {
        return this.repo.create(data);
    }

    save(participant: Partial<TrainingParticipant>): Promise<TrainingParticipant> {
        return this.repo.save(participant as TrainingParticipant);
    }
}
