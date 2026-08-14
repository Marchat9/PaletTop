import {
    Controller,
    Get,
    HttpException,
    InternalServerErrorException,
    Logger,
    Param,
    ParseIntPipe,
} from '@nestjs/common';
import { SessionResponseDto } from '../responses/session.response';
import { SessionService } from '../services/session.service';

@Controller('tournaments/:code/sessions')
export class SessionController {
    private readonly logger = new Logger(SessionController.name);

    constructor(private readonly sessionService: SessionService) {}

    @Get()
    async getSessions(@Param('code') code: string): Promise<SessionResponseDto[]> {
        try {
            return await this.sessionService.getSessions(code);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Get sessions failed`, error);

            throw new InternalServerErrorException('Erreur lors de la récupération des sessions.');
        }
    }

    @Get(':sessionNumber')
    async getSession(
        @Param('code') code: string,
        @Param('sessionNumber', ParseIntPipe) sessionNumber: number,
    ): Promise<SessionResponseDto> {
        try {
            return await this.sessionService.getSessionByNumber(code, sessionNumber);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Get session by number failed`, error);

            throw new InternalServerErrorException('Erreur lors de la récupération de la session.');
        }
    }
}
