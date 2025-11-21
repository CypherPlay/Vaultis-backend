import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RetryInventory, RetryInventoryDocument } from '../schemas/retry-inventory.schema';

@Injectable()
export class RetryInventoryService {
  constructor(
    @InjectModel(RetryInventory.name)
    private retryInventoryModel: Model<RetryInventoryDocument>,
  ) {}

  async addRetries(userId: string, amount: number): Promise<RetryInventoryDocument> {
    if (amount <= 0 || !Number.isInteger(amount)) {
      throw new BadRequestException('Amount must be a positive integer');
    }

    return this.retryInventoryModel
      .findOneAndUpdate(
        { userId: userId },
        { $inc: { retryCount: amount }, updatedAt: new Date() },
        { new: true, upsert: true },
      )
      .exec();
  }

  async deductRetries(userId: string, amount: number): Promise<RetryInventoryDocument> {
    if (amount <= 0 || !Number.isInteger(amount)) {
      throw new BadRequestException('Amount must be a positive integer');
    }

    const retryInventory = await this.retryInventoryModel
      .findOneAndUpdate(
        { userId: userId, retryCount: { $gte: amount } },
        { $inc: { retryCount: -amount }, updatedAt: new Date() },
        { new: true },
      )
      .exec();

    if (!retryInventory) {
      const userExists = await this.retryInventoryModel.findOne({ userId: userId }).exec();
      if (!userExists) {
        throw new BadRequestException('Retry inventory not found for user');
      } else {
        throw new BadRequestException('Insufficient retry tokens');
      }
    }

    return retryInventory;
  }

  async getRetries(userId: string): Promise<number> {
    const retryInventory = await this.retryInventoryModel.findOne({ userId: userId }).exec();
    return retryInventory ? retryInventory.retryCount : 0;
  }
}
