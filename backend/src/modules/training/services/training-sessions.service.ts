import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CheckinParticipantDto } from '../dto/checkin-participant.dto';
import { CreateTrainingSessionDto } from '../dto/create-training-session.dto';
import { TrainingMemberRepository } from '../repositories/training-member.repository';
import { TrainingParticipantRepository } from '../repositories/training-participant.repository';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { TrainingTeamMemberRepository } from '../repositories/training-team-member.repository';
import {
    TrainingSessionAdminDto,
    TrainingSessionPublicDto,
    TrainingSessionSummaryDto,
    toTrainingSessionAdminDto,
    toTrainingSessionPublicDto,
    toTrainingSessionSummaryDto,
} from '../responses/training-session.dto';
import { generateNumericCode } from 'src/common/utils/numeric-code.util';
import { assertSessionOpen } from '../utils/session-guard.utils';
import { TrainingParticipantStatus, TrainingSessionStatus } from 'src/enum/training.enum';
import { TrainingMember } from 'src/entities/training-member.entity';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingAuthService } from './training-auth.service';
import { TrainingSessionAuthService } from './training-session-auth.service';
import { TrainingRealtimeGateway } from '../training-realtime.gateway';

@Injectable()
export class TrainingSessionsService {
    constructor(
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly trainingParticipantRepo: TrainingParticipantRepository,
        private readonly trainingMemberRepo: TrainingMemberRepository,
        private readonly trainingTeamMemberRepo: TrainingTeamMemberRepository,
        private readonly trainingAuthService: TrainingAuthService,
        private readonly trainingSessionAuthService: TrainingSessionAuthService,
        private readonly trainingRealtimeGateway: TrainingRealtimeGateway,
    ) {}

    async create(
        trainingCode: string,
        dto: CreateTrainingSessionDto,
    ): Promise<TrainingSessionAdminDto> {
        const training = await this.trainingAuthService.findWithAdminAuth(
            trainingCode,
            dto.password,
        );

        const now = new Date();
        const session = this.trainingSessionRepo.create({
            training,
            code: await this.generateUniqueSessionCode(),
            date: dto.date,
            status: TrainingSessionStatus.OPEN,
            playersPerTeam: dto.playersPerTeam,
            fallbackTeamSize: dto.fallbackTeamSize,
            allowSitOut: dto.allowSitOut,
            avoidSamePartnerConsecutive: dto.avoidSamePartnerConsecutive,
            avoidSameOpponentConsecutive: dto.avoidSameOpponentConsecutive,
            pointsPerGame: dto.pointsPerGame,
            lastActivityAt: now,
            closedAt: null,
        });
        const saved = await this.trainingSessionRepo.save(session);
        return toTrainingSessionAdminDto(saved);
    }

    async getPublic(sessionCode: string): Promise<TrainingSessionPublicDto> {
        const session = await this.trainingSessionRepo.findByCodeOrThrow(sessionCode);
        return toTrainingSessionPublicDto(session);
    }

    async getAdmin(sessionCode: string, password: string): Promise<TrainingSessionAdminDto> {
        const session = await this.trainingSessionAuthService.findWithAdminAuth(
            sessionCode,
            password,
        );
        return toTrainingSessionAdminDto(session);
    }

    async listSessions(
        trainingCode: string,
        password: string,
    ): Promise<TrainingSessionSummaryDto[]> {
        const training = await this.trainingAuthService.findWithAdminAuth(trainingCode, password);
        const sessions = await this.trainingSessionRepo.findAllByTraining(training.id);
        return sessions.map(toTrainingSessionSummaryDto);
    }

    async close(sessionCode: string, password: string): Promise<TrainingSessionAdminDto> {
        const session = await this.trainingSessionAuthService.findWithAdminAuth(
            sessionCode,
            password,
        );
        // Idempotent : reclôturer une session déjà fermée ne doit pas écraser son closedAt d'origine.
        if (session.status !== TrainingSessionStatus.CLOSED) {
            session.status = TrainingSessionStatus.CLOSED;
            session.closedAt = new Date();
            await this.trainingSessionRepo.closeSession(session.id, session.closedAt);
            this.trainingRealtimeGateway.emitSessionUpdatedFrom(session);
        }
        return toTrainingSessionAdminDto(session);
    }

    async checkin(
        sessionCode: string,
        dto: CheckinParticipantDto,
    ): Promise<TrainingSessionAdminDto> {
        const session = await this.trainingSessionAuthService.findWithAdminAuth(
            sessionCode,
            dto.password,
        );
        assertSessionOpen(session);

        if (!dto.memberId && !dto.name) {
            throw new BadRequestException(
                'Il faut renseigner soit memberId (roster existant), soit name (venue en découverte).',
            );
        }

        let name = dto.name;
        let member: TrainingMember | null = null;
        if (dto.memberId) {
            member = await this.trainingMemberRepo.findById(dto.memberId);
            if (!member || member.training.id !== session.training.id) {
                throw new NotFoundException('Membre introuvable pour cet entraînement.');
            }
            // Filet applicatif à message clair contre un double check-in (double-tap admin, deux
            // appareils) ; le vrai garde-fou contre la race est l'index unique partiel en base
            // (UQ_training_participant_active_member), dont la violation remonte en 409 via
            // runGuarded côté contrôleur.
            const alreadyPresent = session.participants.some(
                (p) =>
                    p.member?.id === member!.id && p.status === TrainingParticipantStatus.PRESENT,
            );
            if (alreadyPresent) {
                throw new ConflictException(`${member.name} est déjà inscrit(e) à cette session.`);
            }
            name = member.name;
        }

        const existingCodes = session.participants.map((p) => p.code);
        const participant = this.trainingParticipantRepo.create({
            session,
            member,
            name: name!,
            code: generateNumericCode(existingCodes),
            status: TrainingParticipantStatus.PRESENT,
        });
        const saved = await this.trainingParticipantRepo.save(participant);

        session.participants = [...session.participants, saved];
        await this.touchLastActivity(session.id);
        return this.emitAndReturn(session);
    }

    async removeParticipant(
        sessionCode: string,
        participantId: string,
        password: string,
    ): Promise<TrainingSessionAdminDto> {
        const session = await this.trainingSessionAuthService.findWithAdminAuth(
            sessionCode,
            password,
        );
        assertSessionOpen(session);
        const participant = session.participants.find((p) => p.id === participantId);
        if (!participant) {
            throw new NotFoundException('Participant introuvable pour cette session.');
        }

        const activeMembership = await this.trainingTeamMemberRepo.findActiveFixedMembership(
            participant.id,
        );
        if (activeMembership) {
            throw new BadRequestException(
                "Ce participant fait partie d'une équipe fixe active ; dissolvez l'équipe avant de le retirer.",
            );
        }

        participant.status = TrainingParticipantStatus.LEFT;
        await this.trainingParticipantRepo.save(participant);
        await this.touchLastActivity(session.id);
        return this.emitAndReturn(session);
    }

    private async touchLastActivity(sessionId: string): Promise<void> {
        await this.trainingSessionRepo.touchLastActivity(sessionId);
    }

    // Construit la réponse et diffuse depuis la session déjà mise à jour en mémoire, cf.
    // TrainingTeamsService.emitAndReturn.
    private emitAndReturn(session: TrainingSession): TrainingSessionAdminDto {
        this.trainingRealtimeGateway.emitSessionUpdatedFrom(session);
        return toTrainingSessionAdminDto(session);
    }

    private async generateUniqueSessionCode(): Promise<string> {
        let code: string;
        do {
            code = generateNumericCode([]);
        } while (await this.trainingSessionRepo.codeExists(code));
        return code;
    }
}
