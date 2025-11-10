import { Riddle, RiddleSchema } from '../schemas/riddle.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeaderboardEntry.name, schema: LeaderboardEntrySchema },
      { name: User.name, schema: UserSchema },
      { name: Guess.name, schema: GuessSchema },
      { name: Riddle.name, schema: RiddleSchema },
    ]),
  ],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
