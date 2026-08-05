import { Injectable } from '@nestjs/common';
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

    async updateStatus(id: string, status: TournamentStatus): Promise<void> {
        let timeStampObj = {};
        switch (status) {
            case TournamentStatus.ACTIVE:
                timeStampObj = { activatedAt: new Date() };
                break;
            case TournamentStatus.COMPLETED:
                timeStampObj = { completedAt: new Date() };
                break;
        }
        await this.repo.update(id, { status, ...timeStampObj });
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

    private daysAgo(days: number): Date {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date;
    }

    private daysFromNow(days: number): Date {
        return this.daysAgo(-days);
    }
}
