import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Team } from 'src/entities/team.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatus } from 'src/enum/status.enum';

export interface TournamentLoadOptions {
    withTeams?: boolean;
    withMatchesInTeams?: boolean;
    withMatches?: boolean;
    withSessions?: boolean;
}

const ADMIN_TOURNAMENT_SORTABLE_COLUMNS: Record<string, string> = {
    name: 'tournament.name',
    code: 'tournament.code',
    status: 'tournament.status',
    date: 'tournament.date',
    createdAt: 'tournament.createdAt',
};

export interface AdminTournamentSearchOptions {
    page: number;
    pageSize: number;
    search?: string;
    status?: TournamentStatus;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
}

@Injectable()
export class TournamentRepository {
    constructor(
        @InjectRepository(Tournament)
        private readonly repo: Repository<Tournament>,
    ) {}

    findAll(): Promise<Tournament[]> {
        return this.repo.find();
    }

    findByCode(code: string): Promise<Tournament | null> {
        return this.repo.findOneBy({ code });
    }

    /**
     * Charge un tournoi après vérification du mot de passe admin.
     * Retourne null si le tournoi est introuvable ou si le mot de passe est incorrect.
     */
    async findWithAuth(
        where: { code?: string; id?: string },
        password: string,
        options: TournamentLoadOptions = {},
    ): Promise<Tournament | null> {
        const queryBuilder = this.repo
            .createQueryBuilder('tournament')
            .where('tournament.adminPassword = :password', { password });

        if (where.code) {
            queryBuilder.andWhere('tournament.code = :code', { code: where.code });
        } else {
            queryBuilder.andWhere('tournament.id = :id', { id: where.id });
        }

        if (options.withTeams) {
            queryBuilder
                .leftJoinAndSelect('tournament.teams', 'team')
                .leftJoinAndSelect('team.players', 'player')
                .leftJoinAndSelect('player.club', 'club');
        }

        if (options.withMatches) {
            queryBuilder
                .leftJoinAndSelect('tournament.matches', 'match')
                .leftJoinAndSelect('match.teamA', 'matchTeamA')
                .leftJoinAndSelect('match.teamB', 'matchTeamB');
        }

        return queryBuilder.getOne();
    }

    async findWithRelations(
        where: { id?: string; code?: string },
        options: TournamentLoadOptions,
    ): Promise<Tournament | null> {
        const tournament = await this.repo.findOne({
            where: where.id ? { id: where.id } : { code: where.code },
            relations: {
                ...(options.withTeams && { teams: { players: true } }),
                ...((options.withMatches || options.withMatchesInTeams) && {
                    matches: { teamA: true, teamB: true },
                }),
                ...(options.withSessions && {
                    matchsSessions: { matches: { teamA: true, teamB: true } },
                }),
            },
        });

        if (!tournament) return null;

        if (
            options.withTeams &&
            options.withMatchesInTeams &&
            tournament.teams &&
            tournament.matches
        ) {
            tournament.teams = tournament.teams.map((team) => ({
                ...team,
                matches: tournament.matches.filter(
                    (m) => m.teamA?.id === team.id || m.teamB?.id === team.id,
                ),
            })) as unknown as Team[];
        }

        if (!options.withMatches) {
            Reflect.deleteProperty(tournament, 'matches');
        }

        return tournament;
    }

    async searchForAdmin(
        options: AdminTournamentSearchOptions,
    ): Promise<{ items: (Tournament & { teamsCount: number })[]; total: number }> {
        const sortColumn =
            (options.sortBy && ADMIN_TOURNAMENT_SORTABLE_COLUMNS[options.sortBy]) ||
            'tournament.createdAt';
        const sortDir = options.sortDir === 'ASC' ? 'ASC' : 'DESC';

        const queryBuilder = this.repo
            .createQueryBuilder('tournament')
            .loadRelationCountAndMap('tournament.teamsCount', 'tournament.teams');

        if (options.search) {
            queryBuilder.andWhere(
                '(unaccent(tournament.name) ILIKE unaccent(:search) OR unaccent(tournament.code) ILIKE unaccent(:search))',
                {
                    search: `%${options.search}%`,
                },
            );
        }
        if (options.status) {
            queryBuilder.andWhere('tournament.status = :status', { status: options.status });
        }

        const [items, total] = await queryBuilder
            .orderBy(sortColumn, sortDir)
            .skip((options.page - 1) * options.pageSize)
            .take(options.pageSize)
            .getManyAndCount();

        return { items: items as (Tournament & { teamsCount: number })[], total };
    }

    private statusTimestamps(
        status: TournamentStatus,
    ): Partial<Pick<Tournament, 'activatedAt' | 'completedAt'>> {
        switch (status) {
            case TournamentStatus.ACTIVE:
                return { activatedAt: new Date() };
            case TournamentStatus.COMPLETED:
                return { completedAt: new Date() };
            default:
                return {};
        }
    }

    async updateStatus(id: string, status: TournamentStatus): Promise<void> {
        await this.repo.update(id, { status, ...this.statusTimestamps(status) });
    }

    save(tournament: Partial<Tournament>): Promise<Tournament> {
        return this.repo.save(tournament as Tournament);
    }

    create(data: Partial<Tournament>): Tournament {
        return this.repo.create(data);
    }

    findExpiredCompleted(retentionDays: number): Promise<Tournament[]> {
        return this.repo.find({
            where: {
                status: TournamentStatus.COMPLETED,
                completedAt: LessThan(this.daysAgo(retentionDays)),
            },
        });
    }

    findExpiredActive(retentionDays: number): Promise<Tournament[]> {
        return this.repo.find({
            where: {
                status: TournamentStatus.ACTIVE,
                activatedAt: LessThan(this.daysAgo(retentionDays)),
            },
        });
    }

    findExpiredDrafts(retentionDays: number, maxFutureDays: number): Promise<Tournament[]> {
        return (
            this.repo
                .createQueryBuilder('tournament')
                .where('tournament.status = :status', { status: TournamentStatus.DRAFT })
                // draft must be at least `retentionDays` old
                .andWhere('tournament.createdAt < :createdThreshold', {
                    createdThreshold: this.daysAgo(retentionDays),
                })
                // and its planned date must look abandoned: too far in the future, or already before it was created
                .andWhere(
                    '(tournament.date > :futureThreshold OR tournament.date < tournament.createdAt)',
                    { futureThreshold: this.daysFromNow(maxFutureDays) },
                )
                .getMany()
        );
    }

    async deleteMany(ids: string[]): Promise<void> {
        if (!ids.length) return;
        await this.repo.delete(ids);
    }

    async updateStatusMany(ids: string[], status: TournamentStatus): Promise<void> {
        if (!ids.length) return;
        // Deliberate raw status flip — does NOT run the orchestration that
        // startTournament()/completeTournament() normally do (pool draw, session
        // creation/closure, websocket events). Setting a tournament to ACTIVE or
        // COMPLETED through this path can leave it without pools/sessions/matches.
        // Accepted as an "I know what I'm doing" super admin escape hatch — the
        // frontend must warn strongly and recommend only using this for CANCELLED.
        // Timestamp bookkeeping (activatedAt/completedAt) is still kept in sync via
        // statusTimestamps() so the cleanup cron's retention queries stay correct.
        await this.repo.update(ids, { status, ...this.statusTimestamps(status) });
    }

    async updateAdminPassword(id: string, newPassword: string): Promise<void> {
        const result = await this.repo.update(id, { adminPassword: newPassword });
        if (!result.affected) {
            throw new NotFoundException('Tournoi introuvable.');
        }
    }

    private daysAgo(days: number): Date {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date;
    }

    private daysFromNow(days: number): Date {
        return this.daysAgo(-days);
    }

    async countByStatus(): Promise<Record<TournamentStatus, number>> {
        const rows = await this.repo
            .createQueryBuilder('tournament')
            .select('tournament.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('tournament.status')
            .getRawMany<{ status: TournamentStatus; count: string }>();

        const counts: Record<TournamentStatus, number> = {
            [TournamentStatus.DRAFT]: 0,
            [TournamentStatus.ACTIVE]: 0,
            [TournamentStatus.COMPLETED]: 0,
            [TournamentStatus.CANCELLED]: 0,
        };
        for (const row of rows) {
            counts[row.status] = Number(row.count);
        }
        return counts;
    }
}
