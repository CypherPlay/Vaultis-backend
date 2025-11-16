import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class WalletService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async deductEntryFee(
    userId: string,
    entryFee: number,
    session: ClientSession,
  ): Promise<void> {
    const user = await this.userModel
      .findById(userId)
      .session(session || null)
      .exec();
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (user.balance >= entryFee) {
      user.balance -= entryFee;
      await user.save({ session });
    } else if (user.retryTokens > 0) {
      user.retryTokens -= 1;
      await user.save({ session });
    } else {
      throw new BadRequestException('Insufficient balance or retry tokens.');
    }
  }

  async creditBalance(userId: string, amount: number): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    user.balance += amount;
    await user.save();
  }

  async addRetryTokens(userId: string, count: number): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    user.retryTokens += count;
    await user.save();
  }

  async getUserBalance(
    userId: string,
  ): Promise<{ balance: number; retryTokens: number }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    return { balance: user.balance, retryTokens: user.retryTokens };
  }
}
