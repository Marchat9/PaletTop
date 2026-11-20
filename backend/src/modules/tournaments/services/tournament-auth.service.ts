import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Tournament } from 'src/entities/tournament.entity';
import { AdminPasswordService } from 'src/modules/admin-password/admin-password.service';
import {
    TournamentLoadOptions,
    TournamentLookup,
    TournamentRepository,
} from '../repositories/tournament.repository';

@Injectable()
export class TournamentAuthService {
    private readonly logger = new Logger(TournamentAuthService.name);

    constructor(
        private readonly tournamentRepo: TournamentRepository,
        private readonly adminPassword: AdminPasswordService,
    ) {}

    /**
     * Verifies the admin password against the stored hash, then loads the tournament. The full
     * load only happens on a correct password, and every failure gets the same error.
     */
    async findWithAdminAuth(
        where: TournamentLookup,
        password: string,
        options: TournamentLoadOptions = {},
    ): Promise<Tournament> {
        const storedHash = await this.tournamentRepo.findAdminPasswordHash(where);
        const tournament = (await this.adminPassword.verify(storedHash, password))
            ? await this.tournamentRepo.findForAdmin(where, options)
            : null;
        if (!tournament) {
            this.logger.warn(`Admin auth failed for tournament ${where.code ?? where.id}`);
            throw new NotFoundException('Tournoi introuvable ou mot de passe invalide');
        }
        return tournament;
    }
}
