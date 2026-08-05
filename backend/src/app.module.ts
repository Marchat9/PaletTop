import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeOrmConfig } from './database/typeorm.config';
import cleanupConfig from './config/cleanup.config';
import { TournamentsModule } from './modules/tournaments/tournaments.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { CleanupModule } from './modules/cleanup/cleanup.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [cleanupConfig] }),
        TypeOrmModule.forRoot(getTypeOrmConfig()),
        TournamentsModule,
        RealtimeModule,
        CleanupModule,
    ],
})
export class AppModule {}
