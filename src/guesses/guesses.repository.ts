import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guess, GuessDocument } from '../schemas/guess.schema';
import { UserDocument } from '../schemas/user.schema';
import { RiddleDocument } from '../schemas/riddle.schema';

@Injectable()
export class GuessesRepository {
  constructor(@InjectModel(Guess.name) private guessModel: Model<GuessDocument>) {}

  async createGuess(
    user: UserDocument,
    riddle: RiddleDocument,
    guessText: string,
    isCorrect: boolean,
  ): Promise<GuessDocument> {
    const newGuess = new this.guessModel({
      user: user._id,
      riddle: riddle._id,
      guessText,
      isCorrect,
      timestamp: new Date(),
    });
    return newGuess.save();
  }

  async findByUserAndRiddle(
    userId: string,
    riddleId: string,
  ): Promise<GuessDocument | null> {
    return this.guessModel.findOne({ user: userId, riddle: riddleId }).exec();
  }

  async updateWinnerStatus(
    guessId: string,
    isWinner: boolean,
  ): Promise<GuessDocument | null> {
    return this.guessModel
      .findByIdAndUpdate(guessId, { isWinner }, { new: true })
      .exec();
  }
}
