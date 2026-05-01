import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const sharedPoolOptions = {
    // Increased stability for remote DB (Railway)
    max: 20, // Increased from 10 to handle more concurrent search requests
    min: 5,
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 30000,
    // Prevents hanging queries from blocking the pool
    statement_timeout: 60000, // Increased to 60s for complex search joins
    query_timeout: 60000,
    // TCP Keepalive to prevent firewalls/Railway from dropping idle sockets
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000, 
    application_name: 'naampata_api',
};

export const typeOrmConfig = (
    configService: ConfigService,
): TypeOrmModuleOptions => {
    const url = configService.get('DATABASE_URL');
    const host = configService.get('DB_HOST');
    const port = parseInt(configService.get('DB_PORT') ?? '5432');
    const sync = configService.get('DB_SYNCHRONIZE') === 'true';
    const ssl = configService.get('DB_SSL') === 'true' || configService.get('NODE_ENV') === 'production';
    const sslConfig = ssl ? { rejectUnauthorized: false } : false;
    // Only enable logging in development AND when explicitly set — too costly with remote DB
    const logging = configService.get('NODE_ENV') !== 'production' && configService.get('DB_LOGGING') === 'true'
        ? ['error', 'warn'] as any
        : false;

    if (url) {
        console.log('🔌 DB: Using DATABASE_URL');
        return {
            type: 'postgres',
            url,
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
            migrationsRun: configService.get('NODE_ENV') === 'production',
            synchronize: configService.get('NODE_ENV') === 'production' ? false : sync,
            logging,
            ssl: sslConfig,
            retryAttempts: 10,
            retryDelay: 3000,
            extra: sharedPoolOptions,
        };
    }

    console.log(`🔌 DB: Connecting to ${host}:${port}`);
    return {
        type: 'postgres',
        host,
        port,
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
        migrationsRun: configService.get('NODE_ENV') === 'production',
        synchronize: configService.get('NODE_ENV') === 'production' ? false : sync,
        logging,
        ssl: sslConfig,
        retryAttempts: 10,
        retryDelay: 3000,
        extra: sharedPoolOptions,
    };
};
