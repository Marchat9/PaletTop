import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateFixedTeamDto } from '../dto/create-fixed-team.dto';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { TrainingTeamMemberRepository } from '../repositories/training-team-member.repository';
import { TrainingTeamRepository } from '../repositories/training-team.repository';
import {
    TrainingSessionAdminDto,
    toTrainingSessionAdminDto,
} from '../responses/training-session.dto';
import { TrainingParticipantStatus, TrainingTeamKind } from 'src/enum/training.enum';
import { TrainingSessionAuthService } from './training-session-auth.service';

@Injectable()
export class TrainingTeamsService {
    constructor(
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly trainingTeamRepo: TrainingTeamRepository,
        private readonly trainingTeamMemberRepo: TrainingTeamMemberRepository,
        private readonly trainingSessionAuthService: TrainingSessionAuthService,
    ) {}

    async createFixedTeam(
        sessionCode: string,
        dto: CreateFixedTeamDto,
    ): Promise<TrainingSessionAdminDto> {
        const session = await this.trainingSessionAuthService.findWithAdminAuth(
            sessionCode,
            dto.password,
        );

        const size = dto.participantIds.length;
        if (size !== session.playersPerTeam && size !== session.fallbackTeamSize) {
            throw new BadRequestException(
                `La taille de l'équipe doit être ${session.playersPerTeam} ou ${session.fallbackTeamSize} (reçu ${size}).`,
            );
        }

        if (new Set(dto.participantIds).size !== size) {
            throw new BadRequestException(
                "Un participant ne peut apparaître qu'une fois dans une équipe.",
            );
        }

        const participants = dto.participantIds.map((id) => {
            const participant = session.participants.find((p) => p.id === id);
            if (!participant || participant.status !== TrainingParticipantStatus.PRESENT) {
                throw new BadRequestException(
                    `Participant ${id} introuvable ou non présent dans cette session.`,
                );
            }
            return participant;
        });

        for (const participant of participants) {
            const activeMembership = await this.trainingTeamMemberRepo.findActiveByParticipant(
                participant.id,
            );
            if (activeMembership) {
                throw new ConflictException(
                    `${participant.name} fait déjà partie d'une équipe fixe active.`,
                );
            }
        }

        const team = this.trainingTeamRepo.create({
            session,
            round: null,
            kind: TrainingTeamKind.FIXED,
            name: dto.name,
        });
        const savedTeam = await this.trainingTeamRepo.save(team);

        const memberRows = participants.map((participant) =>
            this.trainingTeamMemberRepo.create({ team: savedTeam, participant, leftAt: null }),
        );
        await this.trainingTeamMemberRepo.save(memberRows);

        await this.trainingSessionRepo.touchLastActivity(session.id);
        return this.reload(sessionCode, dto.password);
    }

    async dissolveTeam(
        sessionCode: string,
        teamId: string,
        password: string,
    ): Promise<TrainingSessionAdminDto> {
        const session = await this.trainingSessionAuthService.findWithAdminAuth(
            sessionCode,
            password,
        );
        const team = session.teams.find((t) => t.id === teamId);
        if (!team) {
            throw new NotFoundException('Équipe introuvable pour cette session.');
        }
        if (team.kind !== TrainingTeamKind.FIXED) {
            throw new BadRequestException('Seule une équipe fixe peut être dissoute manuellement.');
        }

        await this.trainingTeamMemberRepo.dissolveTeam(team.id);
        await this.trainingSessionRepo.touchLastActivity(session.id);
        return this.reload(sessionCode, password);
    }

    private async reload(sessionCode: string, password: string): Promise<TrainingSessionAdminDto> {
        const session = await this.trainingSessionAuthService.findWithAdminAuth(
            sessionCode,
            password,
        );
        return toTrainingSessionAdminDto(session);
    }
}
