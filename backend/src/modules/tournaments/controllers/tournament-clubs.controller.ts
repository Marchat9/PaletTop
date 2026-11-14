import {
    Body,
    Controller,
    HttpCode,
    HttpException,
    HttpStatus,
    InternalServerErrorException,
    Logger,
    Param,
    Post,
} from '@nestjs/common';
import { ClubSearchDto } from '../dto/club-search.dto';
import { ClubNamesDto } from '../responses/club-names.dto';
import { TournamentClubsService } from '../services/tournament-clubs.service';

@Controller('tournaments/:code/clubs')
export class TournamentClubsController {
    private readonly logger = new Logger(TournamentClubsController.name);

    constructor(private readonly tournamentClubsService: TournamentClubsService) {}

    @Post('search')
    @HttpCode(HttpStatus.OK)
    async searchClubs(
        @Param('code') tournamentCode: string,
        @Body() dto: ClubSearchDto,
    ): Promise<ClubNamesDto> {
        try {
            return await this.tournamentClubsService.searchClubNames(tournamentCode, dto);
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Club search failed`, error);

            throw new InternalServerErrorException(
                'Erreur interne lors de la recherche des clubs.',
            );
        }
    }
}
