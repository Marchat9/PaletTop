import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { MatchesSessionStatus } from 'src/enum/status.enum';

@Injectable()
export class SessionRepository {
    constructor(
        @InjectRepository(MatchesSession)
        private readonly repo: Repository<MatchesSession>,
    ) {}

    findLatestByTournament(tournamentId: string): Promise<MatchesSession | null> {
        return this.repo.findOne({
            where: { tournament: { id: tournamentId } },
            relations: { matches: true },
            order: { sessionNumber: 'DESC' },
        });
    }

    findAllByTournament(tournamentId: string): Promise<MatchesSession[]> {
        return this.repo.find({
            where: { tournament: { id: tournamentId } },
            relations: { matches: { teamA: true, teamB: true, pool: true } },
            order: { sessionNumber: 'ASC' },
        });
    }

    findOpenByTournament(tournamentId: string): Promise<MatchesSession | null> {
        return this.repo.findOne({
            where: { tournament: { id: tournamentId }, status: MatchesSessionStatus.OPEN },
            relations: { matches: { teamA: true, teamB: true } },
        });
    }

    findAllClosedByTournament(tournamentId: string): Promise<MatchesSession[]> {
        return this.repo.find({
            where: { tournament: { id: tournamentId }, status: MatchesSessionStatus.CLOSED },
            relations: { matches: { teamA: true, teamB: true } },
            order: { sessionNumber: 'ASC' },
        });
    }

    findByIdWithMatches(sessionId: string): Promise<MatchesSession | null> {
        return this.repo.findOne({
            where: { id: sessionId },
            relations: { matches: { teamA: true, teamB: true, pool: true } },
        });
    }

    findOneByTournamentAndNumber(
        tournamentId: string,
        sessionNumber: number,
    ): Promise<MatchesSession | null> {
        return this.repo.findOne({
            where: { tournament: { id: tournamentId }, sessionNumber },
            relations: {
                matches: { teamA: { players: true }, teamB: { players: true } },
            },
        });
    }

    async updateStatus(sessionId: string, status: MatchesSessionStatus): Promise<void> {
        await this.repo.update(sessionId, { status });
    }

    save(session: Partial<MatchesSession>): Promise<MatchesSession> {
        return this.repo.save(session as MatchesSession);
    }

    create(data: Partial<MatchesSession>): MatchesSession {
        return this.repo.create(data);
    }
}
