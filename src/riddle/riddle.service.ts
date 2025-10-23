import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Riddle, RiddleDocument } from '../schemas/riddle.schema';

@Injectable()
export class RiddleService {
  constructor(
    @InjectModel(Riddle.name) private riddleModel: Model<RiddleDocument>,
  ) {}

  async findCurrentRiddle(): Promise<Riddle | null> {
    // Find the most recent riddle that has not expired yet
    return this.riddleModel
      .findOne({ expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAll(page = 1, limit = 100): Promise<Riddle[]> {
    const MAX_LIMIT = 500;
    const safeLimit = Math.min(Math.max(1, Number(limit) || 100), MAX_LIMIT);
    const safePage = Math.max(1, Number(page) || 1);
    const skip = (safePage - 1) * safeLimit;
    return this.riddleModel
      .find({}, { answer: 0 }) // Exclude answer by default for general listing
      .skip(skip)
      .limit(safeLimit)
      .exec();
  }

  async findEligibleRiddles(options?: { limit?: number }): Promise<Riddle[]> {
    const MAX_LIMIT = 500;
    const limit = Math.min(options?.limit ?? 100, MAX_LIMIT);
    // Example filter: exclude disabled riddles. Adjust as per your schema.
    const filter = { disabled: { $ne: true } };
    return this.riddleModel.find(filter, { answer: 0 }).limit(limit).exec();
  }

  async findOneEligibleRiddle(randomize = true): Promise<Riddle | null> {
    const filter = { disabled: { $ne: true } }; // Example filter
    if (randomize) {
      const result = await this.riddleModel
        .aggregate([{ $match: filter }, { $sample: { size: 1 } }])
        .exec();
      return result.length > 0 ? result[0] : null;
    } else {
      return this.riddleModel.findOne(filter, { answer: 0 }).exec();
    }
  }
}
