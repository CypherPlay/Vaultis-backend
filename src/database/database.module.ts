import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseConfigModule } from './mongoose.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: true, // Set to false in production
        extra: {
          max: 10, // Maximum number of connections in the pool
          min: 2,  // Minimum number of connections in the pool
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
