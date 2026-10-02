import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Training } from 'src/entities/training.entity';
import { TrainingSessionStatus } from 'src/enum/training.enum';
import { deleteManyByIds, updateAdminPasswordById } from 'src/utils/admin-crud.util';
import { paginateAdminSearch } from 'src/utils/admin-search.util';

export interface AdminTrainingSearchOptions {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
}

const ADMIN_TRAINING_SORTABLE_COLUMNS: Record<string, string> = {
    name: 'training.name',
    code: 'training.code',
    createdAt: 'training.createdAt',
    sessionsCount: 'sessions_count',
    openSessionsCount: 'open_sessions_count',
};

export type AdminTrainingSearchItem = Training & {
    sessionsCount: number;
    openSessionsCount: number;
};

@Injectable()
export class TrainingRepository {
    constructor(
        @InjectRepository(Training)
        private readonly repo: Repository<Training>,
    ) {}

    count(): Promise<number> {
        return this.repo.count();
    }

    create(data: Partial<Training>): Training {
        return this.repo.create(data);
    }

    save(training: Partial<Training>): Promise<Training> {
        return this.repo.save(training as Training);
    }

    findByCode(code: string): Promise<Training | null> {
        return this.repo.findOneBy({ code });
    }

    findWithAuth(code: string, password: string, withMembers = false): Promise<Training | null> {
        const queryBuilder = this.repo
            .createQueryBuilder('training')
            .where('training.code = :code', { code })
            .andWhere('training.adminPassword = :password', { password });

        if (withMembers) {
            queryBuilder.leftJoinAndSelect('training.members', 'member');
        }

        return queryBuilder.getOne();
    }

    findByIdWithDetails(id: string): Promise<Training | null> {
        return this.repo.findOne({
            where: { id },
            relations: { members: true, sessions: { participants: true } },
        });
    }

    async searchForAdmin(
        options: AdminTrainingSearchOptions,
    ): Promise<{ items: AdminTrainingSearchItem[]; total: number }> {
        const queryBuilder = this.repo
            .createQueryBuilder('training')
            .loadRelationCountAndMap('training.sessionsCount', 'training.sessions')
            .loadRelationCountAndMap(
                'training.openSessionsCount',
                'training.sessions',
                'openSession',
                (qb) =>
                    qb.where('openSession.status = :openStatus', {
                        openStatus: TrainingSessionStatus.OPEN,
                    }),
            )
            .addSelect(
                (qb) =>
                    qb
                        .subQuery()
                        .select('COUNT(*)')
                        .from('training_session', 's')
                        .where('s.training_id = training.id'),
                'sessions_count',
            )
            .addSelect(
                (qb) =>
                    qb
                        .subQuery()
                        .select('COUNT(*)')
                        .from('training_session', 'os')
                        .where('os.training_id = training.id')
                        .andWhere('os.status = :openStatus', {
                            openStatus: TrainingSessionStatus.OPEN,
                        }),
                'open_sessions_count',
            );

        const { items, total } = await paginateAdminSearch(
            queryBuilder,
            options,
            '(unaccent(training.name) ILIKE unaccent(:search) OR unaccent(training.code) ILIKE unaccent(:search))',
            ADMIN_TRAINING_SORTABLE_COLUMNS,
            'training.createdAt',
        );

        return { items: items as AdminTrainingSearchItem[], total };
    }

    deleteMany(ids: string[]): Promise<void> {
        return deleteManyByIds(this.repo, ids);
    }

    updateAdminPassword(id: string, newPassword: string): Promise<void> {
        return updateAdminPasswordById(this.repo, id, newPassword, 'Entraînement introuvable.');
    }
}
