import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpThrottlerGuard } from './utils/http-throttler.guard';
import { getTypeOrmConfig } from './database/typeorm.config';
import cleanupConfig from './config/cleanup.config';
import superAdminConfig from './config/super-admin.config';
import trainingAutoCloseConfig from './config/training-auto-close.config';
import { TournamentsModule } from './modules/tournaments/tournaments.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { CleanupModule } from './modules/cleanup/cleanup.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { HealthModule } from './modules/health/health.module';
import { TrainingModule } from './modules/training/training.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [cleanupConfig, superAdminConfig, trainingAutoCloseConfig],
        }),
        TypeOrmModule.forRoot(getTypeOrmConfig()),
        ScheduleModule.forRoot(),
        // Only a floor against automated hammering (e.g. guessing 4-digit participant codes): the
        // limit is set well above what a room full of players and one admin can produce, so normal
        // use never hits it. Both bounds are env-tunable if a very large session ever needs more.
        ThrottlerModule.forRoot([
            {
                ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
                limit: Number(process.env.THROTTLE_LIMIT ?? 300),
            },
        ]),
        TournamentsModule,
        RealtimeModule,
        CleanupModule,
        SuperAdminModule,
        HealthModule,
        TrainingModule,
    ],
    providers: [{ provide: APP_GUARD, useClass: HttpThrottlerGuard }],
})
export class AppModule {}
