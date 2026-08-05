import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TournamentsModule } from 'src/modules/tournaments/tournaments.module';
import { CleanupService } from './cleanup.service';

@Module({
    imports: [ScheduleModule.forRoot(), TournamentsModule],
    providers: [CleanupService],
})
export class CleanupModule {}
