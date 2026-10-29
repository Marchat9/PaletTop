import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AddTrainingMemberDto } from '../dto/add-training-member.dto';
import { CreateTrainingDto } from '../dto/create-training.dto';
import { UpdateTrainingDto } from '../dto/update-training.dto';
import { TrainingMemberRepository } from '../repositories/training-member.repository';
import { TrainingRepository } from '../repositories/training.repository';
import { AdminTrainingDto, toAdminTrainingDto } from '../responses/admin-training.dto';
import { TrainingAuthService } from './training-auth.service';

@Injectable()
export class TrainingsService {
    private readonly logger = new Logger(TrainingsService.name);

    constructor(
        private readonly trainingRepo: TrainingRepository,
        private readonly trainingMemberRepo: TrainingMemberRepository,
        private readonly trainingAuthService: TrainingAuthService,
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
        const member = this.trainingMemberRepo.create({ training, name: dto.name });
        const saved = await this.trainingMemberRepo.save(member);
        training.members = [...training.members, saved];
        this.logger.log(`Member '${saved.name}' added to training ${code}`);
        return toAdminTrainingDto(training);
    }

    async removeMember(
        code: string,
        memberId: string,
        password: string,
    ): Promise<AdminTrainingDto> {
        const training = await this.trainingAuthService.findWithAdminAuth(code, password, true);
        const member = training.members.find((m) => m.id === memberId);
        if (!member) {
            this.logger.warn(`Member ${memberId} not found in training ${code}`);
            throw new NotFoundException('Membre introuvable pour cet entraînement.');
        }
        // Filter BEFORE remove(): TypeORM clears the id of the entity in memory once it is deleted,
        // so comparing .id afterwards no longer works (always undefined).
        training.members = training.members.filter((m) => m.id !== memberId);
        await this.trainingMemberRepo.remove(member);
        this.logger.log(`Member '${member.name}' removed from training ${code}`);
        return toAdminTrainingDto(training);
    }
}
