import { Injectable, BadRequestException } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
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
    private readonly logger: LoggerService,
  ) {}

  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .trim();
  }

  async submitGuess(userId: string, submitGuessDto: SubmitGuessDto) {
    const { riddleId, guess } = submitGuessDto;

    this.logger.log(
      `Attempting guess submission for user ${userId} on riddle ${riddleId}.`,
    );

    const session = await this.connection.startSession();
    session.startTransaction();

    let isCorrectGuess = false; // Flag to determine if the guess was correct

    try {
      // 1. Fetch riddle and its entry fee
      const riddle = await this.riddleModel
        .findById(riddleId)
        .select('+answer')
        .session(session)
        .exec();
      if (!riddle) {
        throw new BadRequestException('Riddle not found.');
      }

      if (riddle.status === 'solved') {
        throw new BadRequestException('Riddle has already been solved.');
      }

      const user = await this.userModel
        .findById(userId)
        .session(session)
        .exec();
      if (!user) {
        throw new BadRequestException('User not found.');
      }

      // 2. Deduct entry fee (atomic check for balance/retry token)
      await this.walletService.deductEntryFee(
        userId,
        parseFloat(riddle.entryFee.toString()),
        session,
      );

      // 3. Create a new Guess entity
      const normalizedGuess = this.normalizeString(guess);
      const normalizedAnswer = this.normalizeString(riddle.answer);
      isCorrectGuess = normalizedGuess === normalizedAnswer; // Assign to the flag

      this.logger.log(
        `Guess result for user ${userId} on riddle ${riddleId}: ${isCorrectGuess ? 'Correct' : 'Incorrect'}.`,
      );

      await this.guessesRepository.createGuess(
        user,
        riddle,
        guess,
        isCorrectGuess, // Use the flag here
        session,
      );

      if (isCorrectGuess) {
        // Mark riddle as solved and assign winner
        const riddleUpdate = await this.riddleModel
          .updateOne(
            { _id: riddleId, status: 'active' },
            {
              $set: { winnerId: new Types.ObjectId(userId), status: 'solved' },
            },
            { session },
          )
          .exec();

        if (riddleUpdate.modifiedCount === 0) {
          await session.abortTransaction();
          throw new BadRequestException('Riddle has already been solved.');
        }

        // Award prize to the user
        const prizeAmount = parseFloat(riddle.prizePool.toString());
        await this.userModel
          .updateOne(
            { _id: userId },
            {
              $inc: { balance: prizeAmount },
              $push: { solvedRiddles: riddleId },
            },
            { session },
          )
          .exec();

        this.logger.log(
          `Riddle ${riddleId} solved by user ${userId}. Prize awarded.`,
        );
        await session.commitTransaction();
        // Leaderboard update will be handled outside the transaction
        return {
          message: 'Congratulations! You solved the riddle and won the prize!',
        };
      }

      this.logger.log(
        `Guess submitted for riddle ${riddleId} by user ${userId}`,
      );
      await session.commitTransaction();
      return { message: 'Guess submitted successfully' };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Transaction aborted for user ${userId} on riddle ${riddleId} due to error: ${error.message}.`,
        error.stack,
      );
      throw error;
    } finally {
      session.endSession();
      // Leaderboard update logic moved outside the transaction
      if (isCorrectGuess) {
        try {
          await this.leaderboardService.calculateDailyRankings();
          this.logger.log('Leaderboard daily rankings updated successfully.');
        } catch (leaderboardError) {
          this.logger.error(
            'Failed to update leaderboard daily rankings:',
            leaderboardError.stack,
          );
          // Do not re-throw, as this should not affect the user's guess submission
        }
      }
    }
  }
}
