import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class GuessService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async deductEntryFee(userId: string, entryFee: number): Promise<UserDocument> {
    const session = await this.userModel.db.startSession();
    session.startTransaction();
    try {
      const user = await this.userModel.findById(userId).session(session);

      if (!user) {
        throw new BadRequestException('User not found.');
      }

      if (user.balance < entryFee) {
        throw new BadRequestException('Insufficient balance.');
      }

      user.balance -= entryFee;
      await user.save({ session });

      await session.commitTransaction();
      return user;
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to deduct entry fee.');
    } finally {
      session.endSession();
    }
  }
}