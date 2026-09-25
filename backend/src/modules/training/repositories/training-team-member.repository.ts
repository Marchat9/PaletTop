import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { TrainingTeamMember } from 'src/entities/training-team-member.entity';
import { TrainingTeamKind } from 'src/enum/training.enum';

@Injectable()
export class TrainingTeamMemberRepository {
    constructor(
        @InjectRepository(TrainingTeamMember)
        private readonly repo: Repository<TrainingTeamMember>,
    ) {}

    create(data: Partial<TrainingTeamMember>): TrainingTeamMember {
        return this.repo.create(data);
    }

    save(members: Partial<TrainingTeamMember>[]): Promise<TrainingTeamMember[]> {
        return this.repo.save(members as TrainingTeamMember[]);
    }

    findActiveFixedMembership(participantId: string): Promise<TrainingTeamMember | null> {
        return this.repo.findOne({
            where: {
                participant: { id: participantId },
                leftAt: IsNull(),
                kind: TrainingTeamKind.FIXED,
            },
            relations: { participant: true },
        });
    }

    // A single query to check N participants at once (instead of N sequential queries).
    findActiveFixedMemberships(participantIds: string[]): Promise<TrainingTeamMember[]> {
        if (!participantIds.length) return Promise.resolve([]);
        return this.repo.find({
            where: {
                participant: { id: In(participantIds) },
                leftAt: IsNull(),
                kind: TrainingTeamKind.FIXED,
            },
            relations: { participant: true },
        });
    }

    // Non-destructive dissolution: detaches every active member of the team.
    async dissolveTeam(teamId: string): Promise<void> {
        await this.repo.update({ team: { id: teamId }, leftAt: IsNull() }, { leftAt: new Date() });
    }
}
