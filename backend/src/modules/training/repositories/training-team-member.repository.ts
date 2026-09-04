import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
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

    // Scopé à FIXED : les équipes EPHEMERAL n'ont pas de dissolution (leftAt reste toujours NULL
    // pour elles), donc sans ce filtre tout participant ayant déjà joué un round se retrouve
    // faussement détecté comme "déjà dans une équipe fixe active" (bug constaté en revue de code).
    findActiveByParticipant(participantId: string): Promise<TrainingTeamMember | null> {
        return this.repo.findOne({
            where: {
                participant: { id: participantId },
                leftAt: IsNull(),
                team: { kind: TrainingTeamKind.FIXED },
            },
            relations: { team: true },
        });
    }

    /** Dissolution non destructive : détache tous les membres actifs de l'équipe (cf. décision produit). */
    async dissolveTeam(teamId: string): Promise<void> {
        await this.repo.update({ team: { id: teamId }, leftAt: IsNull() }, { leftAt: new Date() });
    }
}
