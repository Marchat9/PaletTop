import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getDataSourceConfig } from './typeorm.config';

const dataSource = new DataSource(getDataSourceConfig());

export default dataSource;
