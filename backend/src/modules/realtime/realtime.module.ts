import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentRepository } from '../tournaments/repositories/tournament.repository';
import { TournamentAuthService } from '../tournaments/services/tournament-auth.service';
import { RealtimeGateway } from './realtime.gateway';

@Module({
    imports: [TypeOrmModule.forFeature([Tournament])],
    providers: [RealtimeGateway, TournamentRepository, TournamentAuthService],
    exports: [RealtimeGateway],
})
export class RealtimeModule {}
