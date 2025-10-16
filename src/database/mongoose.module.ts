
import { Module } from '@nestjs/common';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<MongooseModuleOptions> => ({
        uri: configService.get<string>('MONGODB_URI'),
        ... (configService.get<number>('MONGODB_MAX_POOL_SIZE') ? { maxPoolSize: configService.get<number>('MONGODB_MAX_POOL_SIZE') } : {}),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class MongooseConfigModule {}
