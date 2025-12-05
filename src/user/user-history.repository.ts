import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guess, GuessDocument } from '../schemas/guess.schema'; // Assuming Guess schema is used for user guesses

@Injectable()
export class UserHistoryRepository {
  constructor(@InjectModel(Guess.name) private guessModel: Model<GuessDocument>) {}

  // Add methods for database queries related to user guesses here.
  // Ensure optimized indexing on `userId` and `createdAt` for efficient querying.
  // Example:
  /*
  async findUserGuesses(userId: string, paginationOptions: any) {
    return this.guessModel
      .find({ userId })
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order for recent guesses
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit)
      .exec();
  }
  */
}
