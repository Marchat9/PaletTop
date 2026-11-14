import { Injectable, Logger } from '@nestjs/common';
import { ClubSearchDto } from '../dto/club-search.dto';
import { PlayerClubRepository } from '../repositories/player-club.repository';
import { ClubNamesDto } from '../responses/club-names.dto';
import { TournamentAuthService } from './tournament-auth.service';

@Injectable()
export class TournamentClubsService {
    private readonly logger = new Logger(TournamentClubsService.name);

    constructor(
        private readonly authService: TournamentAuthService,
        private readonly clubRepo: PlayerClubRepository,
    ) {}

    async searchClubNames(code: string, dto: ClubSearchDto): Promise<ClubNamesDto> {
        // Same normalisation as the tournament codes stored in DB (trim + upper case).
        const normalizedCode = code.trim().toUpperCase();
        const tournament = await this.authService.findWithAdminAuth(
            { code: normalizedCode },
            dto.password,
        );

        const names = await this.clubRepo.searchNamesForTournament(tournament.id, dto.search ?? '');
        this.logger.log(`Club search for tournament ${normalizedCode}: ${names.length} result(s)`);

        return { names };
    }
}
