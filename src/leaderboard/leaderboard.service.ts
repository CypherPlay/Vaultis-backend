import { Injectable, UseInterceptors } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guess, GuessDocument } from '../schemas/guess.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Riddle, RiddleDocument } from '../schemas/riddle.schema';
import { LeaderboardEntry } from '../schemas/leaderboard-entry.schema';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectModel(Guess.name) private guessModel: Model<GuessDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Riddle.name) private riddleModel: Model<RiddleDocument>,
  ) {}

  @UseInterceptors(CacheInterceptor)
  @CacheKey('daily_leaderboard')
  @CacheTTL(60 * 60 * 12) // Cache for 12 hours
  async getDailyLeaderboard(): Promise<LeaderboardEntry[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const dailyLeaderboard = await this.guessModel.aggregate([
      {
        $match: {
          isCorrect: true,
          submittedAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: '$userId',
          totalCorrectGuesses: { $sum: 1 },
          firstCorrectGuessAt: { $min: '$submittedAt' },
        },
      },
      {
        $sort: {
          totalCorrectGuesses: -1,
          firstCorrectGuessAt: 1,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: '$user.username',
          score: '$totalCorrectGuesses',
          submittedAt: '$firstCorrectGuessAt',
        },
      },
    ]).exec();

    return dailyLeaderboard;
  }

  @UseInterceptors(CacheInterceptor)
  @CacheKey('all_time_leaderboard')
  @CacheTTL(60 * 60 * 24) // Cache for 24 hours
  async getAllTimeLeaderboard(): Promise<LeaderboardEntry[]> {
    const allTimeLeaderboard = await this.guessModel.aggregate([
      {
        $match: {
          isCorrect: true,
        },
      },
      {
        $group: {
          _id: '$userId',
          totalCorrectGuesses: { $sum: 1 },
          firstCorrectGuessAt: { $min: '$submittedAt' },
        },
      },
      {
        $sort: {
          totalCorrectGuesses: -1,
          firstCorrectGuessAt: 1,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: '$user.username',
          score: '$totalCorrectGuesses',
          submittedAt: '$firstCorrectGuessAt',
        },
      },
    ]).exec();

    return allTimeLeaderboard;
  }
}