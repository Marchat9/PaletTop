import { Module } from '@nestjs/common';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { SuperAdminAuthGuard } from './super-admin-auth.guard';
import { SuperAdminClubsController } from './super-admin-clubs.controller';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminTournamentsController } from './super-admin-tournaments.controller';

@Module({
    imports: [TournamentsModule],
    controllers: [SuperAdminController, SuperAdminTournamentsController, SuperAdminClubsController],
    providers: [SuperAdminService, SuperAdminAuthGuard],
})
export class SuperAdminModule {}
