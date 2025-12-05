import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { UserHistoryController } from './user-history.controller';
import { UserHistoryService } from './user-history.service';
import { Guess, GuessSchema } from '../schemas/guess.schema';
import { Riddle, RiddleSchema } from '../schemas/riddle.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Guess.name, schema: GuessSchema },
      { name: Riddle.name, schema: RiddleSchema },
    ]),
  ],
  controllers: [UserHistoryController],
  providers: [UserService, UserHistoryService],
  exports: [UserService, UserHistoryService],
})
export class UserModule {}
