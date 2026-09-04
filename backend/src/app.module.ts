import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
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
        // Enregistré ici (racine de composition) plutôt que dans CleanupModule : aucun module
        // consommateur de SchedulerRegistry (CleanupModule, TrainingModule) ne doit dépendre d'un
        // effet de bord d'un autre module pour fonctionner.
        ScheduleModule.forRoot(),
        TournamentsModule,
        RealtimeModule,
        CleanupModule,
        SuperAdminModule,
        HealthModule,
        TrainingModule,
    ],
})
export class AppModule {}
