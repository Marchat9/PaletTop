import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Player } from 'src/entities/player.entity';
import { PlayerClub } from 'src/entities/player_club.entity';

const ADMIN_CLUB_SORTABLE_COLUMNS: Record<string, string> = {
    name: 'club.name',
    playersCount: 'players_count',
};

export const CLUB_SEARCH_LIMIT = 15;

// Escapes the LIKE wildcards (and the escape character itself) so a search is matched literally.
export function escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
}

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

    // Batch version of findOrCreate: one query to find every already-existing club, one
    // (optional) bulk insert for the missing ones — instead of a query + maybe-insert per
    // name, which used to run sequentially once per distinct club name in a team import.
    // Two different raw names can normalize to the same club (spacing/case); the result
    // maps every raw input to the same, de-duplicated PlayerClub in that case.
    async findOrCreateMany(rawNames: string[]): Promise<Map<string, PlayerClub>> {
        const normalize = (name: string): string => name.trim().replace(/\s+/g, '').toLowerCase();

        const firstRawByNormalized = new Map<string, string>();
        for (const rawName of rawNames) {
            const trimmed = rawName.trim();
            const normalized = normalize(trimmed);
            if (!firstRawByNormalized.has(normalized)) {
                firstRawByNormalized.set(normalized, trimmed);
            }
        }

        const result = new Map<string, PlayerClub>();
        const uniqueNormalizedNames = [...firstRawByNormalized.keys()];
        if (uniqueNormalizedNames.length === 0) return result;

        const existingClubs = await this.repo
            .createQueryBuilder('club')
            .where("regexp_replace(lower(club.name), '\\s+', '', 'g') IN (:...normalizedNames)", {
                normalizedNames: uniqueNormalizedNames,
            })
            .getMany();

        const clubByNormalized = new Map<string, PlayerClub>();
        for (const club of existingClubs) {
            clubByNormalized.set(normalize(club.name), club);
        }

        const missingNormalizedNames = uniqueNormalizedNames.filter(
            (normalized) => !clubByNormalized.has(normalized),
        );
        if (missingNormalizedNames.length > 0) {
            const created = await this.repo.save(
                missingNormalizedNames.map((normalized) =>
                    this.repo.create({ name: firstRawByNormalized.get(normalized)! }),
                ),
            );
            for (const club of created) {
                clubByNormalized.set(normalize(club.name), club);
            }
        }

        for (const rawName of rawNames) {
            const club = clubByNormalized.get(normalize(rawName));
            if (club) result.set(rawName, club);
        }

        return result;
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

    // Club names for the autocomplete: clubs already present in the tournament first, then the most
    // populated ones; when searching, names starting with the search come before the others.
    async searchNamesForTournament(
        tournamentId: string,
        search: string,
        limit = CLUB_SEARCH_LIMIT,
    ): Promise<string[]> {
        const inTournament =
            'EXISTS (SELECT 1 FROM players pt WHERE pt.player_club_id = club.id AND pt.tournament_id = :tournamentId)';

        const queryBuilder = this.repo
            .createQueryBuilder('club')
            .select('club.name', 'name')
            .addSelect(
                (qb) =>
                    qb
                        .subQuery()
                        .select('COUNT(*)')
                        .from('players', 'p')
                        .where('p.player_club_id = club.id'),
                'players_count',
            )
            .addSelect(inTournament, 'in_tournament')
            .setParameter('tournamentId', tournamentId);

        if (search) {
            const escaped = escapeLikePattern(search);
            queryBuilder
                .addSelect(
                    'CASE WHEN unaccent(club.name) ILIKE unaccent(:prefix) THEN 0 ELSE 1 END',
                    'starts_with',
                )
                .where('unaccent(club.name) ILIKE unaccent(:contains)', {
                    contains: `%${escaped}%`,
                })
                .setParameter('prefix', `${escaped}%`)
                .orderBy('in_tournament', 'DESC')
                .addOrderBy('players_count', 'DESC')
                .addOrderBy('starts_with', 'ASC');
        } else {
            queryBuilder
                .where(inTournament)
                .orderBy('in_tournament', 'DESC')
                .addOrderBy('players_count', 'DESC');
        }

        const rows = await queryBuilder
            .addOrderBy('club.name', 'ASC')
            .limit(limit)
            .getRawMany<{ name: string }>();

        return rows.map((row) => row.name);
    }

    async findByNormalizedName(
        name: string,
        excludeIds?: string | string[],
    ): Promise<PlayerClub | null> {
        const normalizedName = name.trim().replace(/\s+/g, '').toLowerCase();
        const queryBuilder = this.repo
            .createQueryBuilder('club')
            .where("regexp_replace(lower(club.name), '\\s+', '', 'g') = :normalizedName", {
                normalizedName,
            });
        const excluded = (Array.isArray(excludeIds) ? excludeIds : [excludeIds]).filter(
            (id): id is string => !!id,
        );
        if (excluded.length > 0) {
            queryBuilder.andWhere('club.id NOT IN (:...excludeIds)', { excludeIds: excluded });
        }
        return queryBuilder.getOne();
    }

    findByIds(ids: string[]): Promise<PlayerClub[]> {
        if (!ids.length) return Promise.resolve([]);
        return this.repo.findBy({ id: In(ids) });
    }

    // Goes through the repository manager so the update joins the ambient @Transactional() one.
    async movePlayers(sourceClubId: string, targetClubId: string): Promise<number> {
        const result = await this.repo.manager
            .createQueryBuilder()
            .update(Player)
            .set({ club: { id: targetClubId } })
            .where('player_club_id = :sourceClubId', { sourceClubId })
            .execute();
        return result.affected ?? 0;
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
