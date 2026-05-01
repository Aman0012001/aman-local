import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const config: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'business_saas_db',
  entities: ['dist/**/*.entity{.ts,.js}', 'src/**/*.entity{.ts,.js}'],
  synchronize: true, // Force sync for development to align with local Postgres
  logging: true,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
};

// Debug logging
console.log('🔍 TypeORM Configuration:', {
  host: config.host,
  port: config.port,
  username: config.username,
  database: config.database,
  password: config.password
    ? '***' + String(config.password).slice(-2)
    : '(empty)',
});

export const typeOrmConfig = config;
