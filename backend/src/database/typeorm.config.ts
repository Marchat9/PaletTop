import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

function isDevBddEnvironment(): boolean {
    const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? '';
    return environment === 'dev-bdd';
}

function parseNumber(value: string | undefined, defaultValue: number): number {
    if (value === undefined) return defaultValue;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
}

/**
 * Connection pool of the running app. Without a wait limit, a request that finds no free
 * connection waits forever: the reverse proxy then answers 504 after its own timeout and the
 * backend logs nothing. With these limits it fails within seconds, with an error in the logs.
 *
 * Kept out of the CLI data source: a migration run by hand must not be cut by the statement
 * timeout.
 */
function getPoolConfig() {
    return {
        poolSize: parseNumber(process.env.DB_POOL_SIZE, 20),
        // Also bounds the wait for a free connection when the pool is full (pg-pool).
        connectTimeoutMS: parseNumber(process.env.DB_POOL_ACQUIRE_TIMEOUT_MS, 5_000),
        // Logged as a warning by TypeORM ("query is slow"), whatever the logging level.
        maxQueryExecutionTime: parseNumber(process.env.DB_SLOW_QUERY_MS, 1_000),
        extra: {
            statement_timeout: parseNumber(process.env.DB_STATEMENT_TIMEOUT_MS, 30_000),
        },
    };
}

function getBaseConfig() {
    return {
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
}

export function getTypeOrmConfig(): TypeOrmModuleOptions {
    const isDevBdd = isDevBddEnvironment();

    return {
        ...getBaseConfig(),
        ...getPoolConfig(),
        autoLoadEntities: true,
        synchronize: isDevBdd,
        dropSchema: isDevBdd,
        migrationsRun: !isDevBdd,
        logging: isDevBdd ? ['error', 'warn', 'schema'] : ['error', 'warn'],
    };
}

export function getDataSourceConfig(): DataSourceOptions {
    return {
        ...getBaseConfig(),
        synchronize: false,
        logging: false,
    };
}
