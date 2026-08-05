import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

function isDevBddEnvironment(): boolean {
    const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? '';
    return environment === 'dev-bdd';
}

const baseConfig = {
    type: 'postgres' as const,
    host: process.env.DB_HOST ?? 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'palet',
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'typeorm_migrations',
};

export function getTypeOrmConfig(): TypeOrmModuleOptions {
    const isDevBdd = isDevBddEnvironment();

    return {
        ...baseConfig,
        autoLoadEntities: true,
        synchronize: isDevBdd,
        dropSchema: isDevBdd,
        migrationsRun: !isDevBdd,
        logging: isDevBdd ? ['error', 'warn', 'schema'] : ['error', 'warn'],
    };
}

export function getDataSourceConfig(): DataSourceOptions {
    return {
        ...baseConfig,
        synchronize: false,
        logging: false,
    };
}
