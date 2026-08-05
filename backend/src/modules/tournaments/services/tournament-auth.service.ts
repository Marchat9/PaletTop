import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentLoadOptions, TournamentRepository } from '../repositories/tournament.repository';

@Injectable()
export class TournamentAuthService {
    private readonly logger = new Logger(TournamentAuthService.name);

    constructor(private readonly tournamentRepo: TournamentRepository) {}

    async findWithAdminAuth(
        where: { code?: string; id?: string },
        password: string,
        options: TournamentLoadOptions = {},
    ): Promise<Tournament> {
        const tournament = await this.tournamentRepo.findWithAuth(where, password, options);
        if (!tournament) {
            this.logger.warn(`Admin auth failed for tournament ${where.code ?? where.id}`);
            throw new NotFoundException('Tournoi introuvable ou mot de passe invalide');
        }
        return tournament;
    }
}
