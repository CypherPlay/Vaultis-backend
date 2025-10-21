import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findById(id: string): Promise<User> {
    return this.userModel.findById(id).exec();
  }

  async deductBalance(userId: string, amount: number): Promise<User> {
    return this.userModel.findByIdAndUpdate(userId, { $inc: { walletBalance: -amount } }, { new: true }).exec();
  }

  async hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
    const user = await this.findById(userId);
    return user && user.walletBalance >= amount;
  }
}
