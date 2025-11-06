import { Injectable, BadRequestException } from '@nestjs/common';
import { SubmitGuessDto } from './dto/submit-guess.dto';
import { WalletService } from '../wallet/wallet.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Riddle, RiddleDocument } from '../schemas/riddle.schema';

@Injectable()
export class GuessesService {
  constructor(
    private readonly walletService: WalletService,
    @InjectModel(Riddle.name) private riddleModel: Model<RiddleDocument>,
  ) {}

  async submitGuess(userId: string, walletAddress: string, submitGuessDto: SubmitGuessDto) {
    const { riddleId, guess } = submitGuessDto;

    // 1. Fetch riddle and its entry fee
    const riddle = await this.riddleModel.findById(riddleId).exec();
    if (!riddle) {
      throw new BadRequestException('Riddle not found.');
    }

    // 2. Deduct entry fee (atomic check for balance/retry token)
    await this.walletService.deductEntryFee(userId, riddle.entryFee);

    // TODO: Implement the actual guess submission logic here.
    // This will involve interacting with the database, verifying the guess,
    // updating user scores, and potentially handling blockchain interactions.
    console.log(`Guess submitted for riddle ${riddleId} by user ${userId}`);
    return { message: 'Guess submitted successfully (service placeholder)' };
  }
}
