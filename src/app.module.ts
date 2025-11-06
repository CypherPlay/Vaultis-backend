import { GuessesModule } from './guesses/guesses.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from './database/database.module';
import { RiddleModule } from './riddle/riddle.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [AuthModule, DatabaseModule, GuessesModule, LeaderboardModule, RiddleModule, WalletModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
