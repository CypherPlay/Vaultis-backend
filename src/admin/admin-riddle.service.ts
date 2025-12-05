import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { Riddle, RiddleDocument } from '../schemas/riddle.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { AdminCreateRiddleDto } from './dto/admin-create-riddle.dto';
import { AdminUpdateRiddleDto } from './dto/admin-update-riddle.dto';
import { FinalizePrizeDto } from './dto/finalize-prize.dto';

@Injectable()
export class AdminRiddleService {
  constructor(
    @InjectModel(Riddle.name) private readonly riddleModel: Model<RiddleDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async createRiddle(adminCreateRiddleDto: AdminCreateRiddleDto): Promise<Riddle> {
    const answerHash = crypto.createHash('sha256').update(adminCreateRiddleDto.answer).digest('hex');
    const newRiddle = new this.riddleModel({
      ...adminCreateRiddleDto,
      answer: undefined, // Remove plain answer
      answerHash,
      entryFee: Types.Decimal128.fromString(adminCreateRiddleDto.value),
      prizePool: Types.Decimal128.fromString('0'), // Initial prize pool is 0
      expiresAt: new Date(adminCreateRiddleDto.expiresAt),
      status: 'active',
      winnerId: null,
      winnerAddress: null,
      completedAt: null,
    });
    return newRiddle.save();
  }

  async updateRiddle(id: string, adminUpdateRiddleDto: AdminUpdateRiddleDto): Promise<Riddle> {
    const existingRiddle = await this.riddleModel.findById(id).exec();
    if (!existingRiddle) {
      throw new NotFoundException(`Riddle with ID ${id} not found`);
    }

    if (existingRiddle.status === 'completed' || existingRiddle.status === 'solved') {
      throw new BadRequestException(`Riddle with ID ${id} cannot be updated as it is already ${existingRiddle.status}`);
    }

    if (adminUpdateRiddleDto.answer) {
      existingRiddle.answerHash = crypto.createHash('sha256').update(adminUpdateRiddleDto.answer).digest('hex');
      existingRiddle.answer = undefined; // Ensure plain answer is not stored
    }

    if (adminUpdateRiddleDto.value) {
      existingRiddle.entryFee = Types.Decimal128.fromString(adminUpdateRiddleDto.value);
      adminUpdateRiddleDto.value = undefined; // Ensure value is not directly updated from DTO
    }

    Object.assign(existingRiddle, adminUpdateRiddleDto);

    return existingRiddle.save();
  }

  async finalizePrize(id: string, finalizePrizeDto: FinalizePrizeDto): Promise<Riddle> {
    const existingRiddle = await this.riddleModel.findById(id).exec();
    if (!existingRiddle) {
      throw new NotFoundException(`Riddle with ID ${id} not found`);
    }

    if (existingRiddle.status !== 'solved') {
      throw new BadRequestException(`Riddle with ID ${id} is not in 'solved' status.`);
    }

    if (!existingRiddle.winnerId) {
      throw new BadRequestException(`Riddle with ID ${id} does not have a winner ID.`);
    }

    const winnerUser = await this.userModel.findById(existingRiddle.winnerId).exec();
    if (!winnerUser) {
      throw new BadRequestException(`Winner user with ID ${existingRiddle.winnerId} not found.`);
    }

    if (winnerUser.walletAddress !== finalizePrizeDto.winnerAddress) {
      throw new BadRequestException(`Provided winner address ${finalizePrizeDto.winnerAddress} does not match the stored winner address for user ${winnerUser._id}.`);
    }

    existingRiddle.prizePayoutHash = finalizePrizeDto.transactionHash;
    existingRiddle.status = 'completed';
    existingRiddle.winnerAddress = finalizePrizeDto.winnerAddress;
    existingRiddle.completedAt = new Date(finalizePrizeDto.date);

    return existingRiddle.save();
  }
}
