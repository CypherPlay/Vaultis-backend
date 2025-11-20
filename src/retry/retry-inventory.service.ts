import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class RetryInventoryService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async addRetries(userId: string, amount: number): Promise<UserDocument> {
    const session = await this.userModel.db.startSession();
    session.startTransaction();
    try {
      const user = await this.userModel.findByIdAndUpdate(
        userId,
        { $inc: { retryTokens: amount } },
        { new: true, session }
      ).exec();

      if (!user) {
        throw new BadRequestException('User not found');
      }

      await session.commitTransaction();
      return user;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async deductRetries(userId: string, amount: number): Promise<UserDocument> {
    const session = await this.userModel.db.startSession();
    session.startTransaction();
    try {
      const user = await this.userModel.findById(userId).session(session).exec();

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.retryTokens < amount) {
        throw new BadRequestException('Insufficient retry tokens');
      }

      user.retryTokens -= amount;
      await user.save({ session });

      await session.commitTransaction();
      return user;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getRetries(userId: string): Promise<number> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user.retryTokens;
  }
}