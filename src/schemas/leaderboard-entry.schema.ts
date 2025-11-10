import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';
import { Riddle } from './riddle.schema'; // Import Riddle schema

export type LeaderboardEntryDocument = LeaderboardEntry & Document;

@Schema({ timestamps: true })
export class LeaderboardEntry {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Riddle', required: true, index: true })
  riddleId: Riddle;

  @Prop({ required: true, default: 0 })
  totalWinnings: number;

  @Prop({ required: true, unique: true })
  rank: number;

  @Prop({ index: true }) // createdAt is automatically managed by timestamps: true
  createdAt?: Date;
}

export const LeaderboardEntrySchema = SchemaFactory.createForClass(LeaderboardEntry);
