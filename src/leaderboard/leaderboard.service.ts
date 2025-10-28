import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { LeaderboardEntry, LeaderboardEntryDocument } from '../schemas/leaderboard-entry.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Guess, GuessDocument } from '../schemas/guess.schema';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectModel(LeaderboardEntry.name) private leaderboardEntryModel: Model<LeaderboardEntryDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Guess.name) private guessModel: Model<GuessDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  @Cron('0 * * * *') // Run every hour
  async calculateRanksAndWinnings(): Promise<void> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const users = await this.userModel.find().session(session).exec();
      const userWinnings: { userId: Types.ObjectId; totalWinnings: number }[] = [];

      for (const user of users) {
        const correctGuessesCount = await this.guessModel.countDocuments({
          userId: user._id,
          isCorrect: true,
        }).session(session).exec();
        userWinnings.push({ userId: user._id as Types.ObjectId, totalWinnings: correctGuessesCount });
      }

      userWinnings.sort((a, b) => b.totalWinnings - a.totalWinnings);

      await this.leaderboardEntryModel.deleteMany({}).session(session).exec();

      let rank = 1;
      for (const entry of userWinnings) {
        await this.leaderboardEntryModel.create([
          {
            userId: entry.userId,
            totalWinnings: entry.totalWinnings,
            rank: rank,
          },
        ], { session: session });
        rank++;
      }

      await session.commitTransaction();
      console.log('Leaderboard updated successfully.');
    } catch (error) {
      await session.abortTransaction();
      console.error('Failed to update leaderboard:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }
}
