import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardEntry, LeaderboardEntrySchema } from '../schemas/leaderboard-entry.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { Guess, GuessSchema } from '../schemas/guess.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeaderboardEntry.name, schema: LeaderboardEntrySchema },
      { name: User.name, schema: UserSchema },
      { name: Guess.name, schema: GuessSchema },
    ]),
  ],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
