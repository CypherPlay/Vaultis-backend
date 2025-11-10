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
import { CacheModule, CacheInterceptor } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
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
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        url: configService.get<string>('REDIS_URL'),
        ttl: 300, // seconds
      }),
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
