import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateFixedTeamDto } from '../dto/create-fixed-team.dto';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { TrainingTeamMemberRepository } from '../repositories/training-team-member.repository';
import { TrainingTeamRepository } from '../repositories/training-team.repository';
import {
    TrainingSessionAdminDto,
    toTrainingSessionAdminDto,
} from '../responses/training-session.dto';
import { TrainingParticipantStatus, TrainingTeamKind } from 'src/enum/training.enum';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingTeam } from 'src/entities/training-team.entity';
import { TrainingTeamMember } from 'src/entities/training-team-member.entity';
import { assertSessionOpen } from '../utils/session-guard.utils';
import { isActiveMember } from '../utils/team-member.utils';
import { TrainingSessionAuthService } from './training-session-auth.service';
import { TrainingRealtimeGateway } from '../training-realtime.gateway';

@Injectable()
export class TrainingTeamsService {
    private readonly logger = new Logger(TrainingTeamsService.name);

    constructor(
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly trainingTeamRepo: TrainingTeamRepository,
        private readonly trainingTeamMemberRepo: TrainingTeamMemberRepository,
        private readonly trainingSessionAuthService: TrainingSessionAuthService,
        private readonly trainingRealtimeGateway: TrainingRealtimeGateway,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) {}

    async createFixedTeam(
        sessionCode: string,
        dto: CreateFixedTeamDto,
    ): Promise<TrainingSessionAdminDto> {
        const session = await this.trainingSessionAuthService.findWithAdminAuth(
            sessionCode,
            dto.password,
        );
        assertSessionOpen(session, this.logger, 'Fixed team creation');

        const size = dto.participantIds.length;
        const allowedSizes = [
            ...new Set([session.playersPerTeam, ...session.allowedTeamSizes]),
        ].sort((a, b) => a - b);
        if (!allowedSizes.includes(size)) {
            this.logger.warn(
                `Fixed team refused in session ${sessionCode}: size ${size} not allowed (${allowedSizes.join(', ')})`,
            );
            throw new BadRequestException(
                `La taille de l'équipe doit être ${allowedSizes.join(' ou ')} (reçu ${size}).`,
            );
        }

        if (new Set(dto.participantIds).size !== size) {
            this.logger.warn(`Fixed team refused in session ${sessionCode}: duplicate participant`);
            throw new BadRequestException(
                "Un participant ne peut apparaître qu'une fois dans une équipe.",
            );
        }

        const participants = dto.participantIds.map((id) => {
            const participant = session.participants.find((p) => p.id === id);
            if (!participant || participant.status !== TrainingParticipantStatus.PRESENT) {
                this.logger.warn(
                    `Fixed team refused in session ${sessionCode}: participant ${id} not found or not present`,
                );
                throw new BadRequestException(
                    `Participant ${id} introuvable ou non présent dans cette session.`,
                );
            }
            return participant;
        });

        // A single query to check every participant (instead of one per participant) - application-
        // level net with a clear message; the real guarantee against a race between two concurrent
        // creations is the partial unique index in the database (see migration), whose violation
        // becomes a 409 through runGuarded in the controller.
        const activeMemberships = await this.trainingTeamMemberRepo.findActiveFixedMemberships(
            dto.participantIds,
        );
        if (activeMemberships.length > 0) {
            this.logger.warn(
                `Fixed team refused in session ${sessionCode}: '${activeMemberships[0].participant.name}' is already in an active fixed team`,
            );
            throw new ConflictException(
                `${activeMemberships[0].participant.name} fait déjà partie d'une équipe fixe active.`,
            );
        }

        // Team + members + lastActivityAt in a single transaction: a failure on one of these writes
        // must never leave an orphan fixed team without any member in the database, nor fail the
        // request (500) for a team creation that actually succeeded.
        const savedTeam = await this.dataSource.transaction(async (manager) => {
            const teamRepo = manager.getRepository(TrainingTeam);
            const teamMemberRepo = manager.getRepository(TrainingTeamMember);

            const team = teamRepo.create({
                session,
                round: null,
                kind: TrainingTeamKind.FIXED,
                name: dto.name,
            });
            const savedTeam = await teamRepo.save(team);

            const memberRows = participants.map((participant) =>
                teamMemberRepo.create({
                    team: savedTeam,
                    participant,
                    kind: TrainingTeamKind.FIXED,
                    leftAt: null,
                }),
            );
            savedTeam.members = await teamMemberRepo.save(memberRows);
            await manager.update(TrainingSession, session.id, { lastActivityAt: new Date() });
            return savedTeam;
        });

        session.teams = [...session.teams, savedTeam];
        this.logger.log(
            `Fixed team created in session ${sessionCode} (${participants.map((p) => p.name).join(', ')})`,
        );
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
        assertSessionOpen(session, this.logger, 'Team dissolution');
        const team = await this.trainingTeamRepo.findByIdInSession(teamId, session.id);
        if (!team) {
            this.logger.warn(`Team ${teamId} not found in session ${sessionCode}`);
            throw new NotFoundException('Équipe introuvable pour cette session.');
        }
        if (team.kind !== TrainingTeamKind.FIXED) {
            this.logger.warn(
                `Team ${teamId} of session ${sessionCode} is not fixed: not dissolved`,
            );
            throw new BadRequestException('Seule une équipe fixe peut être dissoute manuellement.');
        }

        const now = new Date();
        await this.trainingTeamMemberRepo.dissolveTeam(team.id);
        team.members.forEach((member) => {
            if (isActiveMember(member)) member.leftAt = now;
        });
        const index = session.teams.findIndex((t) => t.id === team.id);
        if (index !== -1) session.teams[index] = team;

        await this.trainingSessionRepo.touchLastActivity(session.id);
        this.logger.log(`Fixed team ${team.id} dissolved in session ${sessionCode}`);
        return this.emitAndReturn(session);
    }

    // Builds the response and broadcasts from the session already loaded in memory (updated by the
    // caller), without re-fetching: the data just written is already there.
    private emitAndReturn(session: TrainingSession): TrainingSessionAdminDto {
        this.trainingRealtimeGateway.emitSessionUpdatedFrom(session);
        return toTrainingSessionAdminDto(session);
    }
}
