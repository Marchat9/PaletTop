import { Module } from '@nestjs/common';
import { TournamentsModule } from 'src/modules/tournaments/tournaments.module';
import { CleanupService } from './cleanup.service';

@Module({
    imports: [TournamentsModule],
    providers: [CleanupService],
})
export class CleanupModule {}
