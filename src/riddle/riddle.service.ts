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
}
