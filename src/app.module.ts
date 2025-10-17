import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from './database/database.module';
import { RiddleModule } from './riddle/riddle.module';
import { GuessModule } from './guess/guess.module';

@Module({
  imports: [DatabaseModule, RiddleModule, GuessModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
