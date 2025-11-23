import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlockchainEvent, BlockchainEventDocument } from '../schemas/blockchain-event.schema';

@Injectable()
export class BlockchainEventRepository {
  constructor(
    @InjectModel(BlockchainEvent.name)
    private blockchainEventModel: Model<BlockchainEventDocument>,
  ) {}

  async create(event: Partial<BlockchainEvent>): Promise<BlockchainEventDocument> {
    const createdEvent = new this.blockchainEventModel(event);
    return createdEvent.save();
  }

  async findByTxHash(txHash: string): Promise<BlockchainEventDocument | null> {
    return this.blockchainEventModel.findOne({ txHash }).exec();
  }

  async findByUserId(userId: string): Promise<BlockchainEventDocument[]> {
    return this.blockchainEventModel.find({ userId }).exec();
  }

  async findByBlockNumber(blockNumber: number): Promise<BlockchainEventDocument[]> {
    return this.blockchainEventModel.find({ blockNumber }).exec();
  }

  async findLatestBlockNumber(): Promise<number | null> {
    const latestEvent = await this.blockchainEventModel.findOne().sort({ blockNumber: -1 }).exec();
    return latestEvent ? latestEvent.blockNumber : null;
  }
}
