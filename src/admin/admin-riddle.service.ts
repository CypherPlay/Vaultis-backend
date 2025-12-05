import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Riddle, RiddleDocument } from '../schemas/riddle.schema';
import { AdminCreateRiddleDto } from './dto/admin-create-riddle.dto';
import { AdminUpdateRiddleDto } from './dto/admin-update-riddle.dto';
import { FinalizePrizeDto } from './dto/finalize-prize.dto';

@Injectable()
export class AdminRiddleService {
  constructor(
    @InjectModel(Riddle.name) private readonly riddleModel: Model<RiddleDocument>,
  ) {}

  async createRiddle(adminCreateRiddleDto: AdminCreateRiddleDto): Promise<Riddle> {
    const newRiddle = new this.riddleModel(adminCreateRiddleDto);
    return newRiddle.save();
  }

  async updateRiddle(id: string, adminUpdateRiddleDto: AdminUpdateRiddleDto): Promise<Riddle> {
    const existingRiddle = await this.riddleModel.findByIdAndUpdate(id, adminUpdateRiddleDto, { new: true }).exec();
    if (!existingRiddle) {
      throw new NotFoundException(`Riddle with ID ${id} not found`);
    }
    return existingRiddle;
  }

  async finalizePrize(id: string, finalizePrizeDto: FinalizePrizeDto): Promise<Riddle> {
    const existingRiddle = await this.riddleModel.findById(id).exec();
    if (!existingRiddle) {
      throw new NotFoundException(`Riddle with ID ${id} not found`);
    }

    // Here you would typically integrate with a blockchain service or external system
    // to trigger the actual prize payout. For this implementation, we'll just update
    // the riddle's status and record the payout details.
    existingRiddle.prizePayoutHash = finalizePrizeDto.transactionHash;
    existingRiddle.status = 'completed'; // Or a new status like 'prize_finalized'
    existingRiddle.completedAt = new Date();

    return existingRiddle.save();
  }
}
