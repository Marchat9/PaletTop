import { Module } from '@nestjs/common';
import { TournamentsModule } from 'src/modules/tournaments/tournaments.module';
import { CleanupService } from './cleanup.service';

// ScheduleModule.forRoot() est enregistré dans AppModule, pas ici : CleanupService en dépend
// (SchedulerRegistry) sans avoir à le posséder lui-même.
@Module({
    imports: [TournamentsModule],
    providers: [CleanupService],
})
export class CleanupModule {}
