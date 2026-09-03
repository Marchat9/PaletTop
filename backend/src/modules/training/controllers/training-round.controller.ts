import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { TrainingPasswordDto } from '../dto/training-password.dto';
import { TrainingRoundDto } from '../responses/training-round.dto';
import { TrainingRoundsService } from '../services/training-rounds.service';

@Controller('trainings/sessions/:sessionCode/rounds')
export class TrainingRoundController {
    constructor(private readonly roundsService: TrainingRoundsService) {}

    @Post()
    generate(
        @Param('sessionCode') sessionCode: string,
        @Body() dto: TrainingPasswordDto,
    ): Promise<TrainingRoundDto> {
        return this.roundsService.generateNextRound(sessionCode, dto.password);
    }

    @Get()
    listAll(@Param('sessionCode') sessionCode: string): Promise<TrainingRoundDto[]> {
        return this.roundsService.listRounds(sessionCode);
    }

    @Get(':roundNumber')
    get(
        @Param('sessionCode') sessionCode: string,
        @Param('roundNumber', ParseIntPipe) roundNumber: number,
    ): Promise<TrainingRoundDto> {
        return this.roundsService.getRound(sessionCode, roundNumber);
    }
}
