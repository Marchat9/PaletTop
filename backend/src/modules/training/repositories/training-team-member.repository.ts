import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TrainingTeamMember } from 'src/entities/training-team-member.entity';

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

    findActiveByParticipant(participantId: string): Promise<TrainingTeamMember | null> {
        return this.repo.findOne({
            where: { participant: { id: participantId }, leftAt: IsNull() },
            relations: { team: true },
        });
    }

    /** Dissolution non destructive : détache tous les membres actifs de l'équipe (cf. décision produit). */
    async dissolveTeam(teamId: string): Promise<void> {
        await this.repo.update({ team: { id: teamId }, leftAt: IsNull() }, { leftAt: new Date() });
    }
}
