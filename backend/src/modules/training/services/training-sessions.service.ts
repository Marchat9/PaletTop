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
import { TrainingRoundRepository } from '../repositories/training-round.repository';
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
import { sameName } from '../utils/same-name.utils';
import { assertSessionOpen } from '../utils/session-guard.utils';
import { hasUnfinishedMatch } from '../utils/round-status.utils';
import {
    TrainingParticipantStatus,
    TrainingRoundStatus,
    TrainingSessionStatus,
} from 'src/enum/training.enum';
import { TrainingMember } from 'src/entities/training-member.entity';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingAuthService } from './training-auth.service';
import { TrainingSessionAuthService } from './training-session-auth.service';
import { TrainingRealtimeGateway } from '../training-realtime.gateway';

const SESSION_CODE_ATTEMPTS = 50;
// Session codes are global to the app: 6 digits (a million codes) instead of 4, so they neither
// run out nor can be guessed easily. Sessions created before keep their 4-digit code.
export const SESSION_CODE_LENGTH = 6;

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
        private readonly trainingRoundRepo: TrainingRoundRepository,
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
            await this.closeCurrentRound(session);
            session.status = TrainingSessionStatus.CLOSED;
            session.closedAt = new Date();
            await this.trainingSessionRepo.closeSession(session.id, session.closedAt);
            this.logger.log(`Training session ${sessionCode} closed by the admin`);
            this.trainingRealtimeGateway.emitSessionUpdatedFrom(session);
        }
        return toTrainingSessionAdminDto(session);
    }

    /**
     * The round in progress is closed with the session, provided all its matches are validated
     * (byes aside): otherwise the closing is refused, a score would be left hanging.
     */
    private async closeCurrentRound(session: TrainingSession): Promise<void> {
        const round = await this.trainingRoundRepo.findLatestBySession(session.id);
        if (!round || round.status !== TrainingRoundStatus.OPEN) {
            return;
        }

        if (hasUnfinishedMatch(round)) {
            this.logger.warn(
                `Closing refused for training session ${session.code}: round ${round.roundNumber} has unvalidated matches`,
            );
            throw new BadRequestException(
                `Le round ${round.roundNumber} n'est pas terminé : tous ses matchs doivent être validés avant de clôturer la séance.`,
            );
        }

        await this.trainingRoundRepo.closeRound(round.id);
        this.logger.log(`Round ${round.roundNumber} of training session ${session.code} closed`);
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
                throw new ConflictException(`${member.name} est déjà inscrit(e) à cette séance.`);
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

        // Names already taken: every club member, even absent from this session (the member takes
        // precedence over a guest, who would lose the history and the member profile), and the
        // guests present. Two identical names would show "Alice · Alice" in the rounds and nobody
        // could tell them apart in the leaderboard.
        if (!member) {
            const members = await this.trainingMemberRepo.findByTraining(session.training.id);
            const homonym = [
                ...members.map((m) => ({ name: m.name, isMember: true })),
                ...session.participants
                    .filter((p) => !p.member && p.status === TrainingParticipantStatus.PRESENT)
                    .map((p) => ({ name: p.name, isMember: false })),
            ].find((taken) => sameName(taken.name, name!));

            if (homonym) {
                this.logger.warn(
                    `Check-in refused in session ${sessionCode}: guest '${name}' matches ${homonym.isMember ? 'the member' : 'the guest'} '${homonym.name}'`,
                );
                throw new ConflictException(
                    homonym.isMember
                        ? `${homonym.name} est membre du club : inscrivez ce membre depuis la liste des membres.`
                        : `${homonym.name} est déjà présent(e) : ajoutez une initiale pour les distinguer.`,
                );
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

    /**
     * Session codes are global: once they are nearly all taken, drawing at random would loop on the
     * database for ever. Past a few attempts, the creation fails with a 409 instead.
     */
    private async generateUniqueSessionCode(): Promise<string> {
        for (let attempt = 0; attempt < SESSION_CODE_ATTEMPTS; attempt++) {
            const code = generateNumericCode([], SESSION_CODE_LENGTH);
            if (!(await this.trainingSessionRepo.codeExists(code))) {
                return code;
            }
        }
        this.logger.error(`No free session code found after ${SESSION_CODE_ATTEMPTS} attempts`);
        throw new ConflictException(
            'Aucun code de séance disponible pour le moment, merci de réessayer.',
        );
    }
}
