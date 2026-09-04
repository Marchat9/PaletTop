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
    toTrainingSessionPublicDto,
} from '../responses/training-session.dto';
import { TrainingParticipantStatus, TrainingTeamKind } from 'src/enum/training.enum';
import { TrainingSession } from 'src/entities/training-session.entity';
import { assertSessionOpen } from '../utils/session-guard.utils';
import { TrainingSessionAuthService } from './training-session-auth.service';
import { TrainingRealtimeGateway } from '../training-realtime.gateway';

@Injectable()
export class TrainingTeamsService {
    constructor(
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly trainingTeamRepo: TrainingTeamRepository,
        private readonly trainingTeamMemberRepo: TrainingTeamMemberRepository,
        private readonly trainingSessionAuthService: TrainingSessionAuthService,
        private readonly trainingRealtimeGateway: TrainingRealtimeGateway,
    ) {}

    async createFixedTeam(
        sessionCode: string,
        dto: CreateFixedTeamDto,
    ): Promise<TrainingSessionAdminDto> {
        const session = await this.trainingSessionAuthService.findWithAdminAuth(
            sessionCode,
            dto.password,
        );
        assertSessionOpen(session);

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

        // Une seule requête pour vérifier tous les participants (au lieu d'une par participant) —
        // filet applicatif à message clair ; la vraie garantie contre une race condition entre deux
        // créations concurrentes est l'index unique partiel en base (cf. migration), dont la
        // violation remonte en 409 via runGuarded côté contrôleur.
        const activeMemberships = await this.trainingTeamMemberRepo.findActiveByParticipants(
            dto.participantIds,
        );
        if (activeMemberships.length > 0) {
            throw new ConflictException(
                `${activeMemberships[0].participant.name} fait déjà partie d'une équipe fixe active.`,
            );
        }

        const team = this.trainingTeamRepo.create({
            session,
            round: null,
            kind: TrainingTeamKind.FIXED,
            name: dto.name,
        });
        const savedTeam = await this.trainingTeamRepo.save(team);

        const memberRows = participants.map((participant) =>
            this.trainingTeamMemberRepo.create({
                team: savedTeam,
                participant,
                kind: TrainingTeamKind.FIXED,
                leftAt: null,
            }),
        );
        savedTeam.members = await this.trainingTeamMemberRepo.save(memberRows);

        await this.trainingSessionRepo.touchLastActivity(session.id);
        session.teams = [...session.teams, savedTeam];
        return this.emitAndReturn(session);
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
        assertSessionOpen(session);
        const team = await this.trainingTeamRepo.findByIdInSession(teamId, session.id);
        if (!team) {
            throw new NotFoundException('Équipe introuvable pour cette session.');
        }
        if (team.kind !== TrainingTeamKind.FIXED) {
            throw new BadRequestException('Seule une équipe fixe peut être dissoute manuellement.');
        }

        const now = new Date();
        await this.trainingTeamMemberRepo.dissolveTeam(team.id);
        team.members.forEach((member) => {
            if (!member.leftAt) member.leftAt = now;
        });
        const index = session.teams.findIndex((t) => t.id === team.id);
        if (index !== -1) session.teams[index] = team;

        await this.trainingSessionRepo.touchLastActivity(session.id);
        return this.emitAndReturn(session);
    }

    // Construit la réponse et diffuse depuis la session déjà chargée en mémoire (mise à jour par
    // l'appelant), sans re-fetch : la donnée qu'on vient d'écrire est déjà là.
    private emitAndReturn(session: TrainingSession): TrainingSessionAdminDto {
        this.trainingRealtimeGateway.emitSessionUpdated(
            session.code,
            toTrainingSessionPublicDto(session),
        );
        return toTrainingSessionAdminDto(session);
    }
}
