import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { RetryInventory, RetryInventoryDocument } from '../schemas/retry-inventory.schema';
import { ProcessedTransaction, ProcessedTransactionDocument } from '../schemas/processed-transaction.schema';

@Injectable()
export class RetryInventoryService {
  constructor(
    @InjectModel(RetryInventory.name)
    private retryInventoryModel: Model<RetryInventoryDocument>,
    @InjectModel(ProcessedTransaction.name)
    private processedTransactionModel: Model<ProcessedTransactionDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly logger: LoggerService,
  ) {}

  async addRetries(userId: string, amount: number, transactionHash?: string): Promise<RetryInventoryDocument> {
    this.logger.log(`Attempting to add ${amount} retries for user ${userId}. Transaction hash: ${transactionHash || 'N/A'}.`, RetryInventoryService.name);

    if (amount <= 0 || !Number.isInteger(amount)) {
      this.logger.warn(`Invalid amount ${amount} provided for adding retries for user ${userId}.`, RetryInventoryService.name);
      throw new BadRequestException('Amount must be a positive integer');
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      let retryInventory: RetryInventoryDocument;

      if (transactionHash) {
        // Check for replay attacks within the transaction
        const existingTransaction = await this.processedTransactionModel.findOne({ transactionHash }).session(session);
        if (existingTransaction) {
          this.logger.warn(`Transaction ${transactionHash} has already been processed for user ${userId}.`, RetryInventoryService.name);
          throw new ConflictException(`Transaction ${transactionHash} has already been processed.`);
        }
      }

      retryInventory = await this.retryInventoryModel
        .findOneAndUpdate(
          { userId: userId },
          { $inc: { retryCount: amount }, updatedAt: new Date() },
          { new: true, upsert: true, session: session },
        )
        .exec();

      if (transactionHash) {
        // Mark transaction as processed only after successful retry addition within the same transaction
        await this.processedTransactionModel.create([{ transactionHash }], { session });
        this.logger.log(`Transaction ${transactionHash} marked as processed for user ${userId}.`, RetryInventoryService.name);
      }

      await session.commitTransaction();
      this.logger.log(`${amount} retries successfully added for user ${userId}. New retry count: ${retryInventory.retryCount}.`, RetryInventoryService.name);
      return retryInventory;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Failed to add retries for user ${userId} with transaction hash ${transactionHash || 'N/A'}: ${error.message}.`,
        error.stack,
        RetryInventoryService.name,
      );
      if (error.code === 11000) { // Duplicate key error for transactionHash
        throw new ConflictException(`Transaction ${transactionHash} has already been processed.`);
      }
      throw error;
    } finally {
      session.endSession();
      this.logger.debug(`Session ended for addRetries for user ${userId}.`, RetryInventoryService.name);
    }
  }

  async deductRetries(userId: string, amount: number, session?: ClientSession): Promise<RetryInventoryDocument> {
    this.logger.log(`Attempting to deduct ${amount} retries for user ${userId}.`, RetryInventoryService.name);

    if (amount <= 0 || !Number.isInteger(amount)) {
      this.logger.warn(`Invalid amount ${amount} provided for deducting retries for user ${userId}.`, RetryInventoryService.name);
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
        this.logger.warn(`Retry inventory not found for user ${userId} during deduction attempt.`, RetryInventoryService.name);
        throw new BadRequestException('Retry inventory not found for user');
      } else {
        this.logger.warn(`Insufficient retry tokens for user ${userId}. Attempted to deduct ${amount}, but only ${userExists.retryCount} available.`, RetryInventoryService.name);
        throw new BadRequestException('Insufficient retry tokens');
      }
    }

    this.logger.log(`${amount} retries successfully deducted for user ${userId}. New retry count: ${retryInventory.retryCount}.`, RetryInventoryService.name);
    return retryInventory;
  }

  async getRetries(userId: string): Promise<number> {
    this.logger.debug(`Fetching retry count for user ${userId}.`, RetryInventoryService.name);
    const retryInventory = await this.retryInventoryModel.findOne({ userId: userId }).exec();
    const retryCount = retryInventory ? retryInventory.retryCount : 0;
    this.logger.log(`User ${userId} has ${retryCount} retries.`, RetryInventoryService.name);
    return retryCount;
  }

  async verifyOnChainPurchase(
    userId: string,
    transactionHash: string,
    expectedAmount: number,
  ): Promise<RetryInventoryDocument> {
    this.logger.log(
      `Attempting to verify on-chain purchase for user ${userId} with transaction hash ${transactionHash} and expected amount ${expectedAmount}.`,
      RetryInventoryService.name,
    );

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
    const retryInventory = await this.addRetries(userId, expectedAmount, transactionHash);
    this.logger.log(
      `On-chain purchase successfully verified and ${expectedAmount} retries added for user ${userId}.`,
      RetryInventoryService.name,
    );
    return retryInventory;
  }
}
