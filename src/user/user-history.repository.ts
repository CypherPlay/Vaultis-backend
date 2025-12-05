import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Guess, GuessDocument } from '../schemas/guess.schema';
import { CreateGuessRepositoryDto } from './dto/create-guess-repository.dto';
import { PaginationDto } from '../dto/pagination.dto';

@Injectable()
export class UserHistoryRepository {
  constructor(@InjectModel(Guess.name) private guessModel: Model<GuessDocument>) {}

  async createGuess(createGuessDto: CreateGuessRepositoryDto): Promise<Guess> {
    const createdGuess = new this.guessModel({
      ...createGuessDto,
      userId: new Types.ObjectId(createGuessDto.userId),
      riddleId: new Types.ObjectId(createGuessDto.riddleId),
    });
    return createdGuess.save();
  }

  async findUserGuesses(
    userId: string,
    pagination: PaginationDto,
  ): Promise<Guess[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format.');
    }

    const query: any = { userId: new Types.ObjectId(userId) };

    // 'afterDate' is not directly supported in PaginationDto, assuming 'createdAt' from 'GuessSchema.index'
    // For 'afterDate' functionality, a separate DTO or parameter would be needed.
    // Here, we use a simple skip/limit with createdAt sorting.

    const limit = pagination.limit ?? 10;
    const page = pagination.page ?? 1;

    return this.guessModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit) 
      .skip((page - 1) * limit) // Implement skip for pagination
      .exec();
  }

  async deleteUserGuess(guessId: string, userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(guessId)) {
      throw new BadRequestException('Invalid guessId format.');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format.');
    }

    const result = await this.guessModel
      .deleteOne({ _id: new Types.ObjectId(guessId), userId: new Types.ObjectId(userId) })
      .exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Guess with ID ${guessId} for user ${userId} not found.`);
    }
    return result.deletedCount > 0;
  }

  async countUserGuesses(userId: string): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format.');
    }
    return this.guessModel.countDocuments({ userId: new Types.ObjectId(userId) }).exec();
  }
}
