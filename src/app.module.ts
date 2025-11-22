import { GuessesModule } from './guesses/guesses.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RiddleModule } from './riddle/riddle.module';
import { WalletModule } from './wallet/wallet.module';
import { AuthModule } from './auth/auth.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { GameModule } from './game/game.module';
import { RetryModule } from './retry/retry.module';
import { CacheModule, CacheInterceptor } from '@nestjs/cache-manager';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    GameModule,
    GuessesModule,
    LeaderboardModule,
    RiddleModule,
    WalletModule,
    RetryModule,
    BlockchainModule,
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (!redisUrl) {
          throw new Error(
            'REDIS_URL not configured: please set REDIS_URL in environment/config',
          );
        }
        const store = new KeyvRedis(redisUrl);
        return {
          store: new Keyv({ store }),
          ttl: 300 * 1000, // milliseconds
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
