import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { RetryInventory, RetryInventoryDocument } from '../schemas/retry-inventory.schema';
import { ProcessedTransaction, ProcessedTransactionDocument } from '../schemas/processed-transaction.schema';

@Injectable()
export class RetryInventoryService {
  constructor(
    @InjectModel(RetryInventory.name)
    private retryInventoryModel: Model<RetryInventoryDocument>,
    @InjectModel(ProcessedTransaction.name)
    private processedTransactionModel: Model<ProcessedTransactionDocument>,
  ) {}

  async addRetries(userId: string, amount: number, transactionHash?: string): Promise<RetryInventoryDocument> {
    if (amount <= 0 || !Number.isInteger(amount)) {
      throw new BadRequestException('Amount must be a positive integer');
    }

    if (transactionHash) {
      // Check for replay attacks
      const existingTransaction = await this.processedTransactionModel.findOne({ transactionHash }).exec();
      if (existingTransaction) {
        throw new ConflictException(`Transaction ${transactionHash} has already been processed.`);
      }
    }

    const retryInventory = await this.retryInventoryModel
      .findOneAndUpdate(
        { userId: userId },
        { $inc: { retryCount: amount }, updatedAt: new Date() },
        { new: true, upsert: true },
      )
      .exec();

    if (transactionHash) {
      // Mark transaction as processed only after successful retry addition
      await this.processedTransactionModel.create({ transactionHash });
    }

    return retryInventory;
  }

  async deductRetries(userId: string, amount: number, session?: ClientSession): Promise<RetryInventoryDocument> {
    if (amount <= 0 || !Number.isInteger(amount)) {
      throw new BadRequestException('Amount must be a positive integer');
    }

    const retryInventory = await this.retryInventoryModel
      .findOneAndUpdate(
        { userId: userId, retryCount: { $gte: amount } },
        { $inc: { retryCount: -amount }, updatedAt: new Date() },
        { new: true, session: session },
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

  async verifyOnChainPurchase(
    userId: string,
    transactionHash: string,
    expectedAmount: number,
  ): Promise<RetryInventoryDocument> {
    // Placeholder for blockchain interaction:
    // 1. Connect to the blockchain (e.g., using web3.js or ethers.js).
    // 2. Retrieve the transaction details using the transactionHash.
    // 3. Verify that the transaction was successful and matches the expectedAmount
    //    and that the recipient address corresponds to the user's wallet.
    // 4. Check for replay attacks (e.g., by storing processed transaction hashes).

    // For now, we'll assume the on-chain verification is successful and
    // directly update the user's retry inventory.
    // In a real-world scenario, this part would involve actual blockchain RPC calls.

    // After successful on-chain verification, update the retry balance in the database.
    return this.addRetries(userId, expectedAmount, transactionHash);
  }
}
