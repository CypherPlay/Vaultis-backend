import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

export type LeaderboardEntryDocument = LeaderboardEntry & Document;

@Schema({ timestamps: true })
export class LeaderboardEntry {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: User;

  @Prop({ required: true, default: 0 })
  totalWinnings: number;

  @Prop({ required: true, unique: true })
  rank: number;
}

export const LeaderboardEntrySchema = SchemaFactory.createForClass(LeaderboardEntry);
