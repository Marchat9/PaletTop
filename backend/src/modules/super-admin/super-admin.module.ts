import { Module } from '@nestjs/common';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { TrainingModule } from '../training/training.module';
import { SuperAdminAuthGuard } from './super-admin-auth.guard';
import { SuperAdminClubsController } from './super-admin-clubs.controller';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminTournamentsController } from './super-admin-tournaments.controller';
import { SuperAdminTrainingsController } from './super-admin-trainings.controller';

@Module({
    imports: [TournamentsModule, TrainingModule],
    controllers: [
        SuperAdminController,
        SuperAdminTournamentsController,
        SuperAdminClubsController,
        SuperAdminTrainingsController,
    ],
    providers: [SuperAdminService, SuperAdminAuthGuard],
})
export class SuperAdminModule {}
