// The app gets backend/.env through ConfigModule; the TypeORM CLI does not, so load it here. Without
// it, `npm run migration:run` would hash the admin passwords with the dev pepper (irreversible).
import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getDataSourceConfig } from './typeorm.config';

const dataSource = new DataSource(getDataSourceConfig());

export default dataSource;
