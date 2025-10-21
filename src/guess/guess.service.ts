import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Guess } from '../schemas/guess.schema';
import { InjectConnection } from '@nestjs/mongoose';
import { UserService } from '../auth/user.service'; // Assuming UserService exists in auth module
import { RiddleService } from '../riddle/riddle.service'; // Assuming RiddleService exists in riddle module

@Injectable()
export class GuessService {
  constructor(
    @InjectModel(Guess.name) private guessModel: Model<Guess>,
    @InjectConnection() private readonly connection: Connection,
    private readonly userService: UserService,
    private readonly riddleService: RiddleService,
  ) {}

  async submitGuess(userId: string, riddleId: string, guessText: string): Promise<Guess> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const entryFee = await this.riddleService.getEntryFee(riddleId);
      if (entryFee === null) {
        throw new NotFoundException(`Riddle with ID ${riddleId} not found.`);
      }

      const hasSufficientBalance = await this.userService.hasSufficientBalance(userId, entryFee);
      if (!hasSufficientBalance) {
        throw new BadRequestException('Insufficient wallet balance to submit a guess.');
      }

      await this.userService.deductBalance(userId, entryFee);

      const newGuess = new this.guessModel({ userId, riddleId, guessText });
      const savedGuess = await newGuess.save({ session });

      await session.commitTransaction();
      return savedGuess;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
