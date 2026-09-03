import { Injectable, NotFoundException } from '@nestjs/common';
import { TrainingTeam } from 'src/entities/training-team.entity';
import { TrainingMatchRepository } from '../repositories/training-match.repository';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { TrainingLeaderboardEntryDto } from '../responses/training-leaderboard.dto';

interface LeaderboardAccumulator {
    name: string;
    wins: number;
    points: number;
}

@Injectable()
export class TrainingLeaderboardService {
    constructor(
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly trainingMatchRepo: TrainingMatchRepository,
    ) {}

    async getLeaderboard(sessionCode: string): Promise<TrainingLeaderboardEntryDto[]> {
        const session = await this.trainingSessionRepo.findByCode(sessionCode);
        if (!session) {
            throw new NotFoundException('Session introuvable.');
        }

        const matches = await this.trainingMatchRepo.findValidatedBySession(session.id);

        const totals = new Map<string, LeaderboardAccumulator>();
        for (const match of matches) {
            this.creditTeam(totals, match.teamA, match.scoreA, match.scoreA > match.scoreB);
            if (match.teamB) {
                this.creditTeam(totals, match.teamB, match.scoreB, match.scoreB > match.scoreA);
            }
        }

        return [...totals.entries()]
            .map(([participantId, entry]) => ({ participantId, ...entry }))
            .sort((a, b) => b.wins - a.wins || b.points - a.points);
    }

    // Agrège sur TOUS les membres de l'équipe telle qu'elle était au moment du match (pas de
    // filtre leftAt) : une équipe fixe dissoute après ce match garde ce match dans l'historique
    // de crédit de ses anciens membres, cf. décision produit "classement par participant".
    private creditTeam(
        totals: Map<string, LeaderboardAccumulator>,
        team: TrainingTeam,
        score: number,
        won: boolean,
    ): void {
        for (const member of team.members ?? []) {
            const entry = totals.get(member.participant.id) ?? {
                name: member.participant.name,
                wins: 0,
                points: 0,
            };
            entry.wins += won ? 1 : 0;
            entry.points += score;
            totals.set(member.participant.id, entry);
        }
    }
}
