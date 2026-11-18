import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting } from 'src/entities/app-setting.entity';
import { AppSettingsController } from './app-settings.controller';
import { AppSettingsService } from './app-settings.service';

/** Global: tournaments, training and cleanup all read their settings from it. */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([AppSetting])],
    controllers: [AppSettingsController],
    providers: [AppSettingsService],
    exports: [AppSettingsService],
})
export class AppSettingsModule {}
