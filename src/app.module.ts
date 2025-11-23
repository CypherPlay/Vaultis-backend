import { GuessesModule } from './guesses/guesses.module';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
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
import { BlockchainModule } from './blockchain/blockchain.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';

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
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
              useFactory: (config: ConfigService) => ([{
                ttl: config.get<number>('THROTTLE_TTL_MS', 60 * 1000),
                limit: config.get<number>('THROTTLE_LIMIT', 10),
              }]),    }),
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
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // No middleware to apply here as ThrottlerGuard is used globally
  }
}
