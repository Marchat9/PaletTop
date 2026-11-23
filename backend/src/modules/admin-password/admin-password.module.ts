import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import passwordConfig from 'src/config/password.config';
import { AdminPasswordService } from './admin-password.service';

@Global()
@Module({
    imports: [ConfigModule.forFeature(passwordConfig)],
    providers: [AdminPasswordService],
    exports: [AdminPasswordService],
})
export class AdminPasswordModule {}
