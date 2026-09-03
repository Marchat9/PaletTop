import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { CreateFixedTeamDto } from '../dto/create-fixed-team.dto';
import { TrainingPasswordDto } from '../dto/training-password.dto';
import { TrainingSessionAdminDto } from '../responses/training-session.dto';
import { TrainingTeamsService } from '../services/training-teams.service';

@Controller('trainings/sessions/:sessionCode/teams')
export class TrainingTeamController {
    constructor(private readonly trainingTeamsService: TrainingTeamsService) {}

    @Post()
    create(
        @Param('sessionCode') sessionCode: string,
        @Body() dto: CreateFixedTeamDto,
    ): Promise<TrainingSessionAdminDto> {
        return this.trainingTeamsService.createFixedTeam(sessionCode, dto);
    }

    @Delete(':teamId')
    dissolve(
        @Param('sessionCode') sessionCode: string,
        @Param('teamId') teamId: string,
        @Body() dto: TrainingPasswordDto,
    ): Promise<TrainingSessionAdminDto> {
        return this.trainingTeamsService.dissolveTeam(sessionCode, teamId, dto.password);
    }
}
