import { Injectable } from '@nestjs/common';
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
        const session = await this.trainingSessionRepo.findByCodeOrThrow(sessionCode);
        return this.getLeaderboardBySessionId(session.id);
    }

    // À utiliser quand l'appelant a déjà résolu/chargé la session (ex. juste après la validation
    // d'un match) : évite de re-fetcher toute la session avec ses jointures rien que pour son id.
    async getLeaderboardBySessionId(sessionId: string): Promise<TrainingLeaderboardEntryDto[]> {
        const matches = await this.trainingMatchRepo.findValidatedBySession(sessionId);

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

    /**
     * Niveau estimé de chaque participant de la séance : points marqués par match en moyenne.
     * Plus stable que le pourcentage de victoires quand peu de matchs ont été joués. Un joueur
     * qui n'a pas encore disputé de match n'y figure pas — son niveau est inconnu, pas nul.
     */
    async getAveragePointsBySessionId(sessionId: string): Promise<Record<string, number>> {
        const matches = await this.trainingMatchRepo.findValidatedBySession(sessionId);

        const totals = new Map<string, { points: number; played: number }>();
        const credit = (team: TrainingTeam, score: number): void => {
            for (const member of team.members ?? []) {
                const entry = totals.get(member.participant.id) ?? { points: 0, played: 0 };
                entry.points += score;
                entry.played += 1;
                totals.set(member.participant.id, entry);
            }
        };

        for (const match of matches) {
            credit(match.teamA, match.scoreA);
            if (match.teamB) {
                credit(match.teamB, match.scoreB);
            }
        }

        const levels: Record<string, number> = {};
        for (const [participantId, entry] of totals) {
            levels[participantId] = entry.points / entry.played;
        }
        return levels;
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
