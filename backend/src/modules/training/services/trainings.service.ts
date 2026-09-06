import { Injectable, NotFoundException } from '@nestjs/common';
import { AddTrainingMemberDto } from '../dto/add-training-member.dto';
import { CreateTrainingDto } from '../dto/create-training.dto';
import { UpdateTrainingDto } from '../dto/update-training.dto';
import { TrainingMemberRepository } from '../repositories/training-member.repository';
import { TrainingRepository } from '../repositories/training.repository';
import { AdminTrainingDto, toAdminTrainingDto } from '../responses/admin-training.dto';
import { TrainingAuthService } from './training-auth.service';

@Injectable()
export class TrainingsService {
    constructor(
        private readonly trainingRepo: TrainingRepository,
        private readonly trainingMemberRepo: TrainingMemberRepository,
        private readonly trainingAuthService: TrainingAuthService,
    ) {}

    async create(dto: CreateTrainingDto): Promise<AdminTrainingDto> {
        const training = this.trainingRepo.create({
            code: dto.code,
            name: dto.name,
            club: dto.club,
            adminPassword: dto.adminPassword,
        });
        const saved = await this.trainingRepo.save(training);
        return toAdminTrainingDto(saved);
    }

    async authenticateAdmin(code: string, password: string): Promise<AdminTrainingDto> {
        const training = await this.trainingAuthService.findWithAdminAuth(code, password, true);
        return toAdminTrainingDto(training);
    }

    async update(code: string, dto: UpdateTrainingDto): Promise<AdminTrainingDto> {
        const training = await this.trainingAuthService.findWithAdminAuth(code, dto.password, true);
        if (dto.name !== undefined) training.name = dto.name;
        if (dto.club !== undefined) training.club = dto.club;
        const saved = await this.trainingRepo.save(training);
        return toAdminTrainingDto(saved);
    }

    async addMember(code: string, dto: AddTrainingMemberDto): Promise<AdminTrainingDto> {
        const training = await this.trainingAuthService.findWithAdminAuth(code, dto.password, true);
        const member = this.trainingMemberRepo.create({ training, name: dto.name });
        const saved = await this.trainingMemberRepo.save(member);
        training.members = [...training.members, saved];
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
            throw new NotFoundException('Membre introuvable pour cet entraînement.');
        }
        // Filtrer AVANT remove() : TypeORM vide l'id de l'entité en mémoire une fois supprimée,
        // donc comparer .id après coup ne fonctionne plus (toujours undefined).
        training.members = training.members.filter((m) => m.id !== memberId);
        await this.trainingMemberRepo.remove(member);
        return toAdminTrainingDto(training);
    }
}
