import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainingTeam } from 'src/entities/training-team.entity';

@Injectable()
export class TrainingTeamRepository {
    constructor(
        @InjectRepository(TrainingTeam)
        private readonly repo: Repository<TrainingTeam>,
    ) {}

    create(data: Partial<TrainingTeam>): TrainingTeam {
        return this.repo.create(data);
    }

    save(team: Partial<TrainingTeam>): Promise<TrainingTeam> {
        return this.repo.save(team as TrainingTeam);
    }

    // Pas de filtre sur team.kind ni round_id ici (contrairement à session.teams, qui ne charge
    // que les équipes FIXED) : sert à distinguer "équipe introuvable" (404) de "équipe éphémère,
    // dissolution manuelle impossible" (400) pour l'appelant.
    findByIdInSession(teamId: string, sessionId: string): Promise<TrainingTeam | null> {
        return this.repo.findOne({ where: { id: teamId, session: { id: sessionId } } });
    }
}
