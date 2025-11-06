import { GuessesModule } from './guesses/guesses.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from './database/database.module';
import { RiddleModule } from './riddle/riddle.module';
import { WalletModule } from './wallet/wallet.module';
import { AuthModule } from './auth/auth.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';

@Module({
  imports: [AuthModule, DatabaseModule, GuessesModule, LeaderboardModule, RiddleModule, WalletModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
