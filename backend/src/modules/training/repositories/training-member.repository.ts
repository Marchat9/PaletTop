import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainingMember } from 'src/entities/training-member.entity';

@Injectable()
export class TrainingMemberRepository {
    constructor(
        @InjectRepository(TrainingMember)
        private readonly repo: Repository<TrainingMember>,
    ) {}

    create(data: Partial<TrainingMember>): TrainingMember {
        return this.repo.create(data);
    }

    save(member: Partial<TrainingMember>): Promise<TrainingMember> {
        return this.repo.save(member as TrainingMember);
    }

    async remove(member: TrainingMember): Promise<void> {
        await this.repo.remove(member);
    }
}
