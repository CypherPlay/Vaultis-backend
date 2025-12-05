import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guess, GuessDocument } from '../schemas/guess.schema';
import { Riddle, RiddleDocument } from '../schemas/riddle.schema';
import { UserGuessHistoryDto } from './dto/user-history.dto';

@Injectable()
export class UserHistoryService {
  constructor(
    @InjectModel(Guess.name) private guessModel: Model<GuessDocument>,
    @InjectModel(Riddle.name) private riddleModel: Model<RiddleDocument>,
  ) {}

  async getUserGuessHistory(userId: string): Promise<UserGuessHistoryDto[]> {
    const guesses = await this.guessModel
      .find({ userId })
      .populate('riddle')
      .sort({ attemptTime: -1 })
      .exec();

    return guesses.map((guess) => ({
      guessId: guess._id,
      riddleId: (guess.riddle as RiddleDocument)._id,
      riddleTitle: (guess.riddle as RiddleDocument).title,
      guessResult: guess.isCorrect ? 'Correct' : 'Incorrect',
      attemptTime: guess.attemptTime,
      userGuess: guess.userGuess,
    }));
  }
}
