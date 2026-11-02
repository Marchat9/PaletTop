import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Training } from 'src/entities/training.entity';
import { TrainingMember } from 'src/entities/training-member.entity';
import { TrainingParticipant } from 'src/entities/training-participant.entity';
import { AddTrainingMemberDto } from '../dto/add-training-member.dto';
import { CreateTrainingDto } from '../dto/create-training.dto';
import { RenameTrainingMemberDto } from '../dto/rename-training-member.dto';
import { UpdateTrainingDto } from '../dto/update-training.dto';
import { TrainingMemberRepository } from '../repositories/training-member.repository';
import { TrainingRepository } from '../repositories/training.repository';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { AdminTrainingDto, toAdminTrainingDto } from '../responses/admin-training.dto';
import { TrainingRealtimeGateway } from '../training-realtime.gateway';
import { TrainingAuthService } from './training-auth.service';
import { TrainingLeaderboardService } from './training-leaderboard.service';

// Two members of a club must be told apart: names are compared regardless of case and of the
// spaces around them.
function sameName(a: string, b: string): boolean {
    return a.trim().toLocaleLowerCase('fr') === b.trim().toLocaleLowerCase('fr');
}

@Injectable()
export class TrainingsService {
    private readonly logger = new Logger(TrainingsService.name);

    constructor(
        private readonly trainingRepo: TrainingRepository,
        private readonly trainingMemberRepo: TrainingMemberRepository,
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly trainingAuthService: TrainingAuthService,
        private readonly trainingLeaderboardService: TrainingLeaderboardService,
        private readonly trainingRealtimeGateway: TrainingRealtimeGateway,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) {}

    async create(dto: CreateTrainingDto): Promise<AdminTrainingDto> {
        const training = this.trainingRepo.create({
            code: dto.code,
            name: dto.name,
            description: dto.description,
            adminPassword: dto.adminPassword,
        });
        const saved = await this.trainingRepo.save(training);
        this.logger.log(`Training created: ${saved.code}`);
        return toAdminTrainingDto(saved);
    }

    async authenticateAdmin(code: string, password: string): Promise<AdminTrainingDto> {
        const training = await this.trainingAuthService.findWithAdminAuth(code, password, true);
        return toAdminTrainingDto(training);
    }

    async update(code: string, dto: UpdateTrainingDto): Promise<AdminTrainingDto> {
        const training = await this.trainingAuthService.findWithAdminAuth(code, dto.password, true);
        if (dto.name !== undefined) training.name = dto.name;
        if (dto.description !== undefined) training.description = dto.description;
        const saved = await this.trainingRepo.save(training);
        this.logger.log(`Training ${code} updated`);
        return toAdminTrainingDto(saved);
    }

    async addMember(code: string, dto: AddTrainingMemberDto): Promise<AdminTrainingDto> {
        const training = await this.trainingAuthService.findWithAdminAuth(code, dto.password, true);
        this.assertNameAvailable(training, dto.name);
        const member = this.trainingMemberRepo.create({ training, name: dto.name });
        const saved = await this.trainingMemberRepo.save(member);
        training.members = [...training.members, saved];
        this.logger.log(`Member '${saved.name}' added to training '${code}'`);
        return toAdminTrainingDto(training);
    }

    /**
     * Renames a member while keeping its history: the member row stays the same, so do the links
     * to its past sessions. The name is copied on each participation at check-in (and read from
     * there by sessions, teams, matches and leaderboards): every participation is renamed too, past
     * sessions included, otherwise they would keep showing the old name.
     */
    async renameMember(
        code: string,
        memberId: string,
        dto: RenameTrainingMemberDto,
    ): Promise<AdminTrainingDto> {
        const training = await this.trainingAuthService.findWithAdminAuth(code, dto.password, true);
        const member = this.findMemberOrThrow(training, memberId);
        const previousName = member.name;
        this.assertNameAvailable(training, dto.name, member.id);

        await this.dataSource.transaction(async (manager) => {
            await manager.update(TrainingMember, member.id, { name: dto.name });
            await manager
                .createQueryBuilder()
                .update(TrainingParticipant)
                .set({ name: dto.name })
                .where('member_id = :memberId', { memberId: member.id })
                .execute();
        });
        member.name = dto.name;
        this.logger.log(`Member '${previousName}' renamed to '${dto.name}' in training '${code}'`);

        await this.broadcastRenameToOpenSessions(member.id);
        return toAdminTrainingDto(training);
    }

    async removeMember(
        code: string,
        memberId: string,
        password: string,
    ): Promise<AdminTrainingDto> {
        const training = await this.trainingAuthService.findWithAdminAuth(code, password, true);
        const member = this.findMemberOrThrow(training, memberId);
        // Filter BEFORE remove(): TypeORM clears the id of the entity in memory once it is deleted,
        // so comparing .id afterwards no longer works (always undefined).
        training.members = training.members.filter((m) => m.id !== memberId);
        await this.trainingMemberRepo.remove(member);
        this.logger.log(`Member '${member.name}' removed from training '${code}'`);
        return toAdminTrainingDto(training);
    }

    private findMemberOrThrow(training: Training, memberId: string): TrainingMember {
        const member = training.members.find((m) => m.id === memberId);
        if (!member) {
            this.logger.warn(`Member ${memberId} not found in training '${training.code}'`);
            throw new NotFoundException('Membre introuvable pour cet entraînement.');
        }
        return member;
    }

    private assertNameAvailable(training: Training, name: string, ignoredMemberId?: string): void {
        const homonym = training.members.find(
            (m) => m.id !== ignoredMemberId && sameName(m.name, name),
        );
        if (homonym) {
            this.logger.warn(
                `Member name '${name}' refused in training '${training.code}': '${homonym.name}' already exists`,
            );
            throw new ConflictException('Un membre porte déjà ce nom dans ce club.');
        }
    }

    /**
     * Sessions still being played show the new name right away, on the admin screen as on the
     * players' phones. Closed sessions read it on their next load. The teams of the current round
     * keep the old name until the next round: rounds are not broadcast again.
     *
     * The rename is already committed: a broadcast failure is logged, not reported to the admin.
     */
    private async broadcastRenameToOpenSessions(memberId: string): Promise<void> {
        try {
            const sessionCodes = await this.trainingSessionRepo.findOpenCodesWithMember(memberId);
            for (const sessionCode of sessionCodes) {
                const session = await this.trainingSessionRepo.findByCodeOrThrow(sessionCode);
                this.trainingRealtimeGateway.emitSessionUpdatedFrom(session);
                const leaderboard = await this.trainingLeaderboardService.getLeaderboardBySessionId(
                    session.id,
                );
                this.trainingRealtimeGateway.emitLeaderboardUpdated(sessionCode, leaderboard);
            }
        } catch (error: unknown) {
            this.logger.error(`Rename broadcast failed for member ${memberId}`, error);
        }
    }
}
