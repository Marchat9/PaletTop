import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });

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
