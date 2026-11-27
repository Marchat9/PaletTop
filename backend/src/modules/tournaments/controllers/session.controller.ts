import {
    Controller,
    Get,
    HttpException,
    InternalServerErrorException,
    Logger,
    Param,
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

            throw new InternalServerErrorException('Erreur lors de la récupération des rounds.');
        }
    }
}
