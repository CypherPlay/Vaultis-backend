import { Injectable, UseInterceptors } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guess, GuessDocument } from '../schemas/guess.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Riddle, RiddleDocument } from '../schemas/riddle.schema';
import { LeaderboardEntry } from '../schemas/leaderboard-entry.schema';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';

interface DailyRankingResult {
  userId: string;
  username: string;
  score: number;
  submittedAt: Date;
}

export interface DailyRankingEntry {
  rank: number;
  userId: string;
  correctGuesses: number;
  submissionTime: Date;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectModel(Guess.name) private guessModel: Model<GuessDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Riddle.name) private riddleModel: Model<RiddleDocument>,
  ) {
  }

  private static getSecondsUntilEndOfDay(): number {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
  }

  async calculateDailyRankings(): Promise<DailyRankingResult[]> {
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
  @CacheKey('daily_leaderboard')
  @CacheTTL(60 * 60 * 12) // Cache for 12 hours
  async getDailyRankings(): Promise<DailyRankingEntry[]> {
    const rankings = await this.calculateDailyRankings();
    return rankings.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      correctGuesses: entry.score,
      submissionTime: entry.submittedAt,
    }));
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