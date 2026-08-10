import {
    Controller,
    Get,
    HttpException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { PlayerClubRepository } from '../repositories/player-club.repository';
import { TournamentRepository } from '../repositories/tournament.repository';
import { MetricsDto, toMetricsDto } from '../responses/metrics.dto';

@Controller('metrics')
export class MetricsController {
    private readonly logger = new Logger(MetricsController.name);

    constructor(
        private readonly tournamentRepo: TournamentRepository,
        private readonly playerClubRepo: PlayerClubRepository,
    ) {}

    @Get()
    async getMetrics(): Promise<MetricsDto> {
        try {
            const [tournamentsByStatus, clubCount] = await Promise.all([
                this.tournamentRepo.countByStatus(),
                this.playerClubRepo.count(),
            ]);
            return toMetricsDto(tournamentsByStatus, clubCount);
        } catch (error: unknown) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Metrics computation failed', error);
            throw new InternalServerErrorException('Erreur lors du calcul des statistiques.');
        }
    }
}
