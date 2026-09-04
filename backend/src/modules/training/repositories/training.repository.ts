import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Training } from 'src/entities/training.entity';
import { deleteManyByIds, updateAdminPasswordById } from 'src/common/repositories/admin-crud.util';
import { paginateAdminSearch } from 'src/common/repositories/admin-search.util';

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
    club: 'training.club',
    createdAt: 'training.createdAt',
    sessionsCount: 'sessions_count',
};

@Injectable()
export class TrainingRepository {
    constructor(
        @InjectRepository(Training)
        private readonly repo: Repository<Training>,
    ) {}

    create(data: Partial<Training>): Training {
        return this.repo.create(data);
    }

    save(training: Partial<Training>): Promise<Training> {
        return this.repo.save(training as Training);
    }

    findByCode(code: string): Promise<Training | null> {
        return this.repo.findOneBy({ code });
    }

    /**
     * Charge un entraînement après vérification du mot de passe admin.
     * Retourne null si l'entraînement est introuvable ou si le mot de passe est incorrect.
     */
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
    ): Promise<{ items: (Training & { sessionsCount: number })[]; total: number }> {
        const queryBuilder = this.repo
            .createQueryBuilder('training')
            .loadRelationCountAndMap('training.sessionsCount', 'training.sessions')
            .addSelect(
                (qb) =>
                    qb
                        .subQuery()
                        .select('COUNT(*)')
                        .from('training_session', 's')
                        .where('s.training_id = training.id'),
                'sessions_count',
            );

        const { items, total } = await paginateAdminSearch(
            queryBuilder,
            options,
            "(unaccent(training.name) ILIKE unaccent(:search) OR unaccent(training.code) ILIKE unaccent(:search) OR unaccent(COALESCE(training.club, '')::text) ILIKE unaccent(:search))",
            ADMIN_TRAINING_SORTABLE_COLUMNS,
            'training.createdAt',
        );

        return { items: items as (Training & { sessionsCount: number })[], total };
    }

    deleteMany(ids: string[]): Promise<void> {
        return deleteManyByIds(this.repo, ids);
    }

    updateAdminPassword(id: string, newPassword: string): Promise<void> {
        return updateAdminPasswordById(this.repo, id, newPassword, 'Entraînement introuvable.');
    }
}
