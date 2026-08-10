import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerClub } from 'src/entities/player_club.entity';

const ADMIN_CLUB_SORTABLE_COLUMNS: Record<string, string> = {
    name: 'club.name',
    playersCount: 'players_count',
};

export interface AdminClubSearchOptions {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
}

@Injectable()
export class PlayerClubRepository {
    constructor(
        @InjectRepository(PlayerClub)
        private readonly repo: Repository<PlayerClub>,
    ) {}

    async findOrCreate(rawName: string): Promise<PlayerClub> {
        const normalizedName = rawName.trim().replace(/\s+/g, '').toLowerCase();

        const existing = await this.repo
            .createQueryBuilder('club')
            .where("regexp_replace(lower(club.name), '\\s+', '', 'g') = :normalizedName", {
                normalizedName,
            })
            .getOne();

        if (existing) return existing;

        return this.repo.save(this.repo.create({ name: rawName.trim() }));
    }

    count(): Promise<number> {
        return this.repo.count();
    }

    async searchForAdmin(
        options: AdminClubSearchOptions,
    ): Promise<{ items: (PlayerClub & { playersCount: number })[]; total: number }> {
        const sortColumn =
            (options.sortBy && ADMIN_CLUB_SORTABLE_COLUMNS[options.sortBy]) || 'club.name';
        const sortDir = options.sortDir === 'ASC' ? 'ASC' : 'DESC';

        const queryBuilder = this.repo
            .createQueryBuilder('club')
            .loadRelationCountAndMap('club.playersCount', 'club.player')
            .addSelect(
                (qb) =>
                    qb
                        .subQuery()
                        .select('COUNT(*)')
                        .from('players', 'p')
                        .where('p.player_club_id = club.id'),
                'players_count',
            );

        if (options.search) {
            queryBuilder.andWhere('unaccent(club.name) ILIKE unaccent(:search)', {
                search: `%${options.search}%`,
            });
        }

        const [items, total] = await queryBuilder
            .orderBy(sortColumn, sortDir)
            .skip((options.page - 1) * options.pageSize)
            .take(options.pageSize)
            .getManyAndCount();

        return { items: items as (PlayerClub & { playersCount: number })[], total };
    }

    async findByNormalizedName(name: string, excludeId?: string): Promise<PlayerClub | null> {
        const normalizedName = name.trim().replace(/\s+/g, '').toLowerCase();
        const queryBuilder = this.repo
            .createQueryBuilder('club')
            .where("regexp_replace(lower(club.name), '\\s+', '', 'g') = :normalizedName", {
                normalizedName,
            });
        if (excludeId) {
            queryBuilder.andWhere('club.id != :excludeId', { excludeId });
        }
        return queryBuilder.getOne();
    }

    async rename(id: string, name: string): Promise<void> {
        const result = await this.repo.update(id, { name: name.trim() });
        if (!result.affected) {
            throw new NotFoundException('Club introuvable.');
        }
    }

    async deleteMany(ids: string[]): Promise<void> {
        if (!ids.length) return;
        await this.repo.delete(ids);
    }
}
