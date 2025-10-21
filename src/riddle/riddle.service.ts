import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Riddle } from '../schemas/riddle.schema';

@Injectable()
export class RiddleService {
  constructor(@InjectModel(Riddle.name) private riddleModel: Model<Riddle>) {}

  async findById(id: string): Promise<Riddle> {
    return this.riddleModel.findById(id).exec();
  }

  async getEntryFee(riddleId: string): Promise<number> {
    const riddle = await this.findById(riddleId);
    return riddle ? riddle.entryFee : 0; // Assuming 'entryFee' field exists in Riddle schema
  }
}
