import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { initializeTransactionalContext, StorageDriver } from 'typeorm-transactional';
import { AppModule } from './app.module';
import { corsOrigin } from './utils/cors-origin.util';

async function bootstrap(): Promise<void> {
    // Must run before the app is created: @Transactional() methods rely on this context.
    initializeTransactionalContext({ storageDriver: StorageDriver.AUTO });

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        cors: { origin: corsOrigin() },
    });

    app.useBodyParser('json', { limit: '2mb' });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );

    await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

bootstrap().catch((error: unknown) => {
    console.error('Bootstrap error', error);
    process.exit(1);
});
