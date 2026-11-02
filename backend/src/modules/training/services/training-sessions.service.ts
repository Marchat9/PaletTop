import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
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
import { generateNumericCode } from 'src/utils/numeric-code.util';
import { assertSessionOpen } from '../utils/session-guard.utils';
import { TrainingParticipantStatus, TrainingSessionStatus } from 'src/enum/training.enum';
import { TrainingMember } from 'src/entities/training-member.entity';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingAuthService } from './training-auth.service';
import { TrainingSessionAuthService } from './training-session-auth.service';
import { TrainingRealtimeGateway } from '../training-realtime.gateway';

@Injectable()
export class TrainingSessionsService {
    private readonly logger = new Logger(TrainingSessionsService.name);

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
            allowedTeamSizes: [...new Set([dto.playersPerTeam, ...dto.allowedTeamSizes])].sort(
                (a, b) => a - b,
            ),
            preferTargetTeamSize: dto.preferTargetTeamSize,
            plateCount: dto.plateCount,
            teamComposition: dto.teamComposition,
            avoidSamePartnerConsecutive: dto.avoidSamePartnerConsecutive,
            avoidSameOpponentConsecutive: dto.avoidSameOpponentConsecutive,
            pointsPerGame: dto.pointsPerGame,
            lastActivityAt: now,
            closedAt: null,
        });
        const saved = await this.trainingSessionRepo.save(session);
        this.logger.log(`Training session ${saved.code} created (training: ${trainingCode})`);
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
        // Idempotent: closing an already closed session must not overwrite its original closedAt.
        if (session.status !== TrainingSessionStatus.CLOSED) {
            session.status = TrainingSessionStatus.CLOSED;
            session.closedAt = new Date();
            await this.trainingSessionRepo.closeSession(session.id, session.closedAt);
            this.logger.log(`Training session ${sessionCode} closed by the admin`);
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
        assertSessionOpen(session, this.logger, 'Check-in');

        if (!dto.memberId && !dto.name) {
            this.logger.warn(
                `Check-in refused in session ${sessionCode}: no member nor name given`,
            );
            throw new BadRequestException(
                'Il faut renseigner soit memberId (roster existant), soit name (venue en découverte).',
            );
        }

        let name = dto.name;
        let member: TrainingMember | null = null;
        if (dto.memberId) {
            member = await this.trainingMemberRepo.findById(dto.memberId);
            if (!member || member.training.id !== session.training.id) {
                this.logger.warn(
                    `Check-in refused in session ${sessionCode}: member ${dto.memberId} not found in its training`,
                );
                throw new NotFoundException('Membre introuvable pour cet entraînement.');
            }
            // Application-level net with a clear message against a double check-in (admin double-
            // tap, two devices); the real guard against the race is the partial unique index in the
            // database (UQ_training_participant_active_member), whose violation becomes a 409
            // through runGuarded in the controller.
            const alreadyPresent = session.participants.some(
                (p) =>
                    p.member?.id === member!.id && p.status === TrainingParticipantStatus.PRESENT,
            );
            if (alreadyPresent) {
                this.logger.warn(
                    `Check-in refused in session ${sessionCode}: '${member.name}' is already present`,
                );
                throw new ConflictException(`${member.name} est déjà inscrit(e) à cette session.`);
            }
            name = member.name;

            const returning = session.participants
                .filter(
                    (p) =>
                        p.member?.id === member!.id && p.status === TrainingParticipantStatus.LEFT,
                )
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

            if (returning) {
                returning.status = TrainingParticipantStatus.PRESENT;
                returning.name = member.name;
                const back = await this.trainingParticipantRepo.save(returning);

                session.participants = session.participants.map((p) =>
                    p.id === back.id ? back : p,
                );
                await this.touchLastActivity(session.id);
                this.logger.log(`'${back.name}' checked in again in session ${sessionCode}`);
                return this.emitAndReturn(session);
            }
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
        this.logger.log(
            `'${saved.name}' checked in session ${sessionCode} (${member ? 'member' : 'guest'})`,
        );
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
        assertSessionOpen(session, this.logger, 'Participant removal');
        const participant = session.participants.find((p) => p.id === participantId);
        if (!participant) {
            this.logger.warn(`Participant ${participantId} not found in session ${sessionCode}`);
            throw new NotFoundException('Participant introuvable pour cette session.');
        }

        const activeMembership = await this.trainingTeamMemberRepo.findActiveFixedMembership(
            participant.id,
        );
        if (activeMembership) {
            this.logger.warn(
                `'${participant.name}' cannot leave session ${sessionCode}: still in an active fixed team`,
            );
            throw new BadRequestException(
                "Ce participant fait partie d'une équipe fixe active ; dissolvez l'équipe avant de le retirer.",
            );
        }

        participant.status = TrainingParticipantStatus.LEFT;
        await this.trainingParticipantRepo.save(participant);
        await this.touchLastActivity(session.id);
        this.logger.log(`'${participant.name}' marked as left in session ${sessionCode}`);
        return this.emitAndReturn(session);
    }

    private async touchLastActivity(sessionId: string): Promise<void> {
        await this.trainingSessionRepo.touchLastActivity(sessionId);
    }

    // Builds the response and broadcasts from the session already updated in memory, see
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
