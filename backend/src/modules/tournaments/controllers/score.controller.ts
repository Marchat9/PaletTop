import {
    Body,
    Controller,
    HttpException,
    InternalServerErrorException,
    Logger,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { AdminUpdateScoreDto } from '../dto/admin-update-score.dto';
import { StartMatchDto } from '../dto/start-match.dto';
import { UpdateScoreDto } from '../dto/update-score.dto';
import { ValidateMatchDto } from '../dto/validate-match.dto';
import { ScoreService } from '../services/score.service';
import { ScoreUpdateResult } from '../responses/score.dto';

@Controller('tournaments/:code/matches/:matchId')
export class ScoreController {
    private readonly logger = new Logger(ScoreController.name);

    constructor(private readonly scoreService: ScoreService) {}

    @Post('start')
    async startMatch(
        @Param('code') code: string,
        @Param('matchId') matchId: string,
        @Body() dto: StartMatchDto,
    ): Promise<TournamentMatch> {
        try {
            return await this.scoreService.startMatch(code, matchId, dto.teamCode);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Match start failed`, error);

            throw new InternalServerErrorException('Erreur lors du démarrage du match.');
        }
    }

    @Patch('score')
    async updateScore(
        @Param('code') code: string,
        @Param('matchId') matchId: string,
        @Body() dto: UpdateScoreDto,
    ): Promise<ScoreUpdateResult> {
        try {
            return await this.scoreService.updateScore(
                code,
                matchId,
                dto.teamCode,
                dto.scoreA,
                dto.scoreB,
            );
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Score update failed`, error);

            throw new InternalServerErrorException('Erreur lors de la saisie du score.');
        }
    }

    @Post('validate')
    async validateMatch(
        @Param('code') tournamentCode: string,
        @Param('matchId') matchId: string,
        @Body() dto: ValidateMatchDto,
    ): Promise<ScoreUpdateResult> {
        try {
            return await this.scoreService.validateMatch(
                tournamentCode,
                matchId,
                dto.teamCode,
                dto.opponentTeamCode,
            );
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Score validate failed`, error);

            throw new InternalServerErrorException('Erreur lors de la validation du match.');
        }
    }

    @Patch('score/admin')
    async adminUpdateScore(
        @Param('code') code: string,
        @Param('matchId') matchId: string,
        @Body() dto: AdminUpdateScoreDto,
    ): Promise<ScoreUpdateResult> {
        try {
            return await this.scoreService.adminUpdateScore(
                code,
                matchId,
                dto.password,
                dto.scoreA,
                dto.scoreB,
            );
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Score admin update failed`, error);

            throw new InternalServerErrorException('Erreur lors de la correction du score.');
        }
    }
}
