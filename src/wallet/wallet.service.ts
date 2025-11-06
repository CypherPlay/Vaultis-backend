import { Injectable, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../database/redis.module';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async deductEntryFee(userId: string, entryFee: number): Promise<void> {
    const lockKey = `lock:user:${userId}:deduct`;
    const lockAcquired = await this.redis.set(lockKey, 'locked', 'PX', 5000, 'NX'); // 5-second lock

    if (!lockAcquired) {
      throw new BadRequestException('Too many concurrent requests. Please try again.');
    }

    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new BadRequestException('User not found.');
      }

      if (user.balance >= entryFee) {
        user.balance -= entryFee;
        await user.save();
      } else if (user.retryTokens > 0) {
        user.retryTokens -= 1;
        await user.save();
      } else {
        throw new BadRequestException('Insufficient balance or retry tokens.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error deducting entry fee:', error);
      throw new InternalServerErrorException('Failed to deduct entry fee.');
    } finally {
      await this.redis.del(lockKey);
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

  async getUserBalance(userId: string): Promise<{ balance: number; retryTokens: number }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found.');');
    }
    return { balance: user.balance, retryTokens: user.retryTokens };
  }
}
