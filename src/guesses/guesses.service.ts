import { Injectable, BadRequestException } from '@nestjs/common';
import { SubmitGuessDto } from './dto/submit-guess.dto';
import { WalletService } from '../wallet/wallet.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Riddle, RiddleDocument } from '../schemas/riddle.schema';
import { Guess, GuessDocument } from '../schemas/guess.schema';
import { InjectConnection } from '@nestjs/mongoose';

@Injectable()
export class GuessesService {
  constructor(
    private readonly walletService: WalletService,
    @InjectModel(Riddle.name) private riddleModel: Model<RiddleDocument>,
    @InjectModel(Guess.name) private guessModel: Model<GuessDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async submitGuess(userId: string, walletAddress: string, submitGuessDto: SubmitGuessDto) {
    const { riddleId, guess } = submitGuessDto;

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // 1. Fetch riddle and its entry fee
      const riddle = await this.riddleModel.findById(riddleId).session(session).exec();
      if (!riddle) {
        throw new BadRequestException('Riddle not found.');
      }

      // 2. Deduct entry fee (atomic check for balance/retry token)
      await this.walletService.deductEntryFee(userId, parseFloat(riddle.entryFee.toString()), session);

      // 3. Create a new Guess entity
      const newGuess = new this.guessModel({
        userId,
        riddleId,
        guess,
        timestamp: new Date(),
      });
      await newGuess.save({ session });

      console.log(`Guess submitted for riddle ${riddleId} by user ${userId}`);
      await session.commitTransaction();
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
