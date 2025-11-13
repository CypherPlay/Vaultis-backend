import { Injectable, BadRequestException } from '@nestjs/common';
import { SubmitGuessDto } from './dto/submit-guess.dto';
import { WalletService } from '../wallet/wallet.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Riddle, RiddleDocument } from '../schemas/riddle.schema';
import { LeaderboardService } from '../leaderboard/leaderboard.service';

import { InjectConnection } from '@nestjs/mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { GuessesRepository } from './guesses.repository';

@Injectable()
export class GuessesService {
  constructor(
    private readonly walletService: WalletService,
    @InjectModel(Riddle.name) private riddleModel: Model<RiddleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly guessesRepository: GuessesRepository,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  private normalizeString(str: string): string {
    return str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();
  }

  async submitGuess(userId: string, walletAddress: string, submitGuessDto: SubmitGuessDto) {
    const { riddleId, guess } = submitGuessDto;

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // 1. Fetch riddle and its entry fee
      const riddle = await this.riddleModel.findById(riddleId).select('+answer').session(session).exec();
      if (!riddle) {
        throw new BadRequestException('Riddle not found.');
      }

      if (riddle.status === 'solved') {
        throw new BadRequestException('Riddle has already been solved.');
      }

      // 2. Deduct entry fee (atomic check for balance/retry token)
      await this.walletService.deductEntryFee(userId, parseFloat(riddle.entryFee.toString()), session);

      // 3. Create a new Guess entity
      const normalizedGuess = this.normalizeString(guess);
      const normalizedAnswer = this.normalizeString(riddle.answer);
      const isCorrect = normalizedGuess === normalizedAnswer;

      const user = await this.userModel.findById(userId).session(session).exec();
      if (!user) {
        throw new BadRequestException('User not found.');
      }

      await this.guessesRepository.createGuess(
        user,
        riddle,
        guess,
        isCorrect,
        session,
      );

      if (isCorrect) {
        // Mark riddle as solved and assign winner
        const riddleUpdate = await this.riddleModel.updateOne(
          { _id: riddleId, status: 'active' },
          { $set: { winnerId: new Types.ObjectId(userId), status: 'solved' } },
          { session }
        ).exec();

        if (riddleUpdate.modifiedCount === 0) {
          await session.abortTransaction();
          throw new BadRequestException('Riddle has already been solved.');
        }

        // Award prize to the user
        const prizeAmount = parseFloat(riddle.prizePool.toString());
        await this.userModel.updateOne(
          { _id: userId },
          { $inc: { balance: prizeAmount }, $push: { solvedRiddles: riddleId } },
          { session }
        ).exec();

        console.log(`Riddle ${riddleId} solved by user ${userId}. Prize awarded.`);
        await session.commitTransaction();
        await this.leaderboardService.updateDailyRankings();
        return { message: 'Congratulations! You solved the riddle and won the prize!' };
      }

      console.log(`Guess submitted for riddle ${riddleId} by user ${userId}`);
      await session.commitTransaction();
      await this.leaderboardService.updateDailyRankings();
      return { message: 'Guess submitted successfully' };
    } catch (error) {
      await session.abortTransaction();
      console.error('Transaction aborted due to error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }
}
