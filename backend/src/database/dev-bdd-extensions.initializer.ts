import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { isDevBddEnvironment } from './typeorm.config';

/**
 * PostgreSQL extensions the queries rely on, created by migrations in the normal mode. The dev-bdd
 * mode syncs the schema from the entities and never runs a migration, so it creates them itself.
 */
export const DEV_BDD_EXTENSIONS = ['unaccent'];

@Injectable()
export class DevBddExtensionsInitializer implements OnModuleInit {
    private readonly logger = new Logger(DevBddExtensionsInitializer.name);

    constructor(private readonly dataSource: DataSource) {}

    async onModuleInit(): Promise<void> {
        if (!isDevBddEnvironment()) {
            return;
        }
        for (const extension of DEV_BDD_EXTENSIONS) {
            await this.dataSource.query(`CREATE EXTENSION IF NOT EXISTS ${extension};`);
            this.logger.log(
                `dev-bdd: PostgreSQL extension '${extension}' created or already there.`,
            );
        }
    }
}
