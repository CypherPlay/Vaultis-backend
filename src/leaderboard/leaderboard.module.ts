import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaderboardEntry, LeaderboardEntrySchema } from '../schemas/leaderboard-entry.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { Guess, GuessSchema } from '../schemas/guess.schema';
import { Riddle, RiddleSchema } from '../schemas/riddle.schema';
import { LeaderboardService } from './leaderboard.service';

import { LeaderboardController } from './leaderboard.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeaderboardEntry.name, schema: LeaderboardEntrySchema },
      { name: User.name, schema: UserSchema },
      { name: Guess.name, schema: GuessSchema },
      { name: Riddle.name, schema: RiddleSchema },
    ]),
  ],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
